import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/security/auth-helper';
import { getConversationMessages, deleteConversation } from '@/lib/db/conversations';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const messages = await getConversationMessages(id, userId);
    return NextResponse.json({ messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const success = await deleteConversation(id, userId);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error deleting conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
