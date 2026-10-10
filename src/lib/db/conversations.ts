import { createAdminClient } from './supabase-admin';

export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  snippet: string;
  similarity: number;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface ConversationRecord {
  id: string;
  user_id: string;
  title: string;
  document_ids: string[];
  created_at: string;
  updated_at: string;
}

const memoryConversations = new Map<string, ConversationRecord>();
const memoryMessages = new Map<string, MessageRecord[]>();

export async function createConversation(
  userId: string,
  title: string = 'New Conversation',
  documentIds: string[] = []
): Promise<ConversationRecord> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title, document_ids: documentIds })
      .select()
      .single();

    if (!error && data) return data as ConversationRecord;
  } catch (e) {
    console.warn('Error creating conversation in Supabase:', e);
  }

  const conv: ConversationRecord = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title,
    document_ids: documentIds,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  memoryConversations.set(conv.id, conv);
  memoryMessages.set(conv.id, []);
  return conv;
}

export async function getUserConversations(userId: string): Promise<ConversationRecord[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) return data as ConversationRecord[];
  } catch (e) {
    console.warn('Error fetching conversations:', e);
  }

  const list: ConversationRecord[] = [];
  memoryConversations.forEach((conv) => {
    if (conv.user_id === userId) list.push(conv);
  });
  return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getConversationMessages(conversationId: string, userId: string): Promise<MessageRecord[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Manual RLS check since we use admin client
      if (data.length > 0 && data[0].user_id !== userId) return [];
      return data as MessageRecord[];
    }
  } catch (e) {
    console.warn('Error fetching messages:', e);
  }

  const msgs = memoryMessages.get(conversationId) || [];
  if (msgs.length > 0 && msgs[0].user_id !== userId) return [];
  return msgs;
}

export async function addMessageToConversation(
  conversationId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  citations: Citation[] = []
): Promise<MessageRecord> {
  // First verify conversation ownership
  try {
    const supabase = createAdminClient();
    const { data: conv } = await supabase.from('conversations').select('user_id').eq('id', conversationId).single();
    if (conv && conv.user_id !== userId) {
      throw new Error('Unauthorized conversation access');
    }
  } catch(e: any) {
    if (e.message === 'Unauthorized conversation access') throw e;
  }
  
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        citations,
      })
      .select()
      .single();

    // Touch conversation updated_at
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);

    if (!error && data) return data as MessageRecord;
  } catch (e) {
    console.warn('Error saving message to Supabase:', e);
  }

  const msg: MessageRecord = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    citations,
    created_at: new Date().toISOString(),
  };

  const existing = memoryMessages.get(conversationId) || [];
  memoryMessages.set(conversationId, [...existing, msg]);

  const conv = memoryConversations.get(conversationId);
  if (conv) {
    conv.updated_at = new Date().toISOString();
    // Auto-rename title if first user message
    if (role === 'user' && existing.length === 0) {
      conv.title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
    }
  }

  return msg;
}

export async function deleteConversation(conversationId: string, userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    await supabase.from('conversations').delete().eq('id', conversationId).eq('user_id', userId);
  } catch (e) {
    console.warn('Error deleting conversation:', e);
  }
  memoryConversations.delete(conversationId);
  memoryMessages.delete(conversationId);
  return true;
}
