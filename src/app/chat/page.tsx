'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Navbar } from '@/components/navbar';
import { CitationBadge } from '@/components/citation-badge';
import { PDFViewer } from '@/components/pdf-viewer';
import { UploadModal } from '@/components/upload-modal';
import { Citation, MessageRecord, ConversationRecord } from '@/lib/db/conversations';
import { DocumentRecord } from '@/lib/db/documents';
import {
  MessageSquare,
  Plus,
  Send,
  FileText,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Bot,
  User,
  Layers,
  ChevronRight,
} from 'lucide-react';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialDocId = searchParams.get('docId');

  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);

  // Document Selection
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    initialDocId ? [initialDocId] : []
  );

  // Active PDF Viewer State
  const [activePdfViewer, setActivePdfViewer] = useState<{
    docName: string;
    pageNumber: number;
    docId?: string;
  } | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
    fetchConversations();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (e) {
      console.warn('Error fetching docs:', e);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.conversations && data.conversations.length > 0) {
        setConversations(data.conversations);
        setActiveConvId(data.conversations[0].id);
        fetchMessages(data.conversations[0].id);
      }
    } catch (e) {
      console.warn('Error fetching conversations:', e);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.warn('Error fetching messages:', e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation', documentIds: selectedDocIds }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConvId(data.conversation.id);
        setMessages([]);
      }
    } catch (e) {
      console.error('New chat error:', e);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    fetchMessages(id);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Delete conv error:', err);
    }
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendMessage = async (queryToSubmit?: string) => {
    const q = queryToSubmit || inputQuery;
    if (!q.trim() || isGenerating) return;

    setInputQuery('');
    setIsGenerating(true);
    setStreamingText('');
    setStreamingCitations([]);

    const tempUserMsg: MessageRecord = {
      id: `temp_${Date.now()}`,
      conversation_id: activeConvId || '',
      user_id: 'user',
      role: 'user',
      content: q,
      citations: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          conversationId: activeConvId,
          documentIds: selectedDocIds,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get answer');
      }

      const newConvId = res.headers.get('X-Conversation-Id');
      if (newConvId && newConvId !== activeConvId) {
        setActiveConvId(newConvId);
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let currentText = '';
        let metaParsed = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          if (!metaParsed && chunk.includes('---META_END---')) {
            const parts = chunk.split('---META_END---\n');
            try {
              const metaObj = JSON.parse(parts[0]);
              if (metaObj.citations) {
                setStreamingCitations(metaObj.citations);
              }
            } catch {
              /* ignore parse */
            }
            metaParsed = true;
            currentText += parts[1] || '';
          } else {
            currentText += chunk;
          }

          setStreamingText(currentText);
        }

        const finalAssistantMsg: MessageRecord = {
          id: `assistant_${Date.now()}`,
          conversation_id: newConvId || activeConvId || '',
          user_id: 'assistant',
          role: 'assistant',
          content: currentText,
          citations: streamingCitations,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, finalAssistantMsg]);
        fetchConversations();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing question';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          conversation_id: activeConvId || '',
          user_id: 'assistant',
          role: 'assistant',
          content: `⚠️ Error: ${msg}`,
          citations: [],
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsGenerating(false);
      setStreamingText('');
      setStreamingCitations([]);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col h-screen overflow-hidden">
      <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR */}
        <aside className="w-80 glass-panel border-r border-white/10 hidden md:flex flex-col p-4 gap-4 shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 px-4 rounded-xl gradient-bg font-semibold text-sm shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Recent Conversations
            </h4>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                  activeConvId === conv.id
                    ? 'bg-purple-600/25 border border-purple-500/40 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-400 hover:text-rose-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Filter Documents
              </span>
              <button
                onClick={() => setSelectedDocIds([])}
                className="text-[10px] text-purple-400 hover:underline"
              >
                Clear selection
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              <div
                onClick={() => setSelectedDocIds([])}
                className={`p-2 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-2 transition-colors ${
                  selectedDocIds.length === 0
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Search All Documents</span>
              </div>

              {documents.map((doc) => {
                const isIndexed = doc.processing_status === 'indexed';
                const isSelected = selectedDocIds.includes(doc.id) && isIndexed;
                return (
                  <div
                    key={doc.id}
                    onClick={() => isIndexed && toggleDocumentSelection(doc.id)}
                    className={`p-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                      !isIndexed ? 'opacity-50 cursor-not-allowed text-gray-500' :
                      isSelected
                        ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 cursor-pointer'
                        : 'text-gray-400 hover:bg-white/5 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isIndexed}
                      onChange={() => {}}
                      className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-0"
                    />
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isIndexed ? 'text-purple-400' : 'text-gray-500'}`} />
                    <span className="truncate">{doc.file_name}</span>
                    {!isIndexed && <span className="text-[9px] ml-auto">({doc.processing_status})</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN CHAT AREA */}
        <main className="flex-1 flex flex-col h-full bg-[#090a0f] relative overflow-hidden">
          {activePdfViewer && (
            <div className="absolute inset-4 z-40">
              <PDFViewer
                documentName={activePdfViewer.docName}
                initialPage={activePdfViewer.pageNumber}
                documentId={activePdfViewer.docId}
                onClose={() => setActivePdfViewer(null)}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.length === 0 && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto py-12">
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-4 shadow-xl shadow-purple-500/20">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ask Anything About Your Documents</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Queries perform vector similarity search against your uploaded PDF chunks and return grounded answers with citations.
                </p>

                <div className="w-full space-y-2 text-left">
                  {[
                    'What are the key eligibility requirements?',
                    'What is the refund or cancellation policy deadline?',
                    'Summarize the primary conclusions of the document.',
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(sample)}
                      className="w-full text-xs text-gray-300 glass-card p-3 rounded-xl hover:border-purple-500/40 text-left transition-all flex items-center justify-between group"
                    >
                      <span>{sample}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl mx-auto ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center shrink-0 shadow-md">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-[85%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                          : 'glass-card border border-white/10 text-gray-200'
                      }`}
                    >
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {msg.role === 'assistant' && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                          <span className="text-[10px] font-mono">Grounded RAG Answer</span>
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="p-1 hover:bg-white/10 rounded flex items-center gap-1 text-[11px] text-gray-400 hover:text-white"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedMsgId === msg.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Source Page Citations ({msg.citations.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.citations.map((cit, idx) => (
                            <CitationBadge
                              key={idx}
                              citation={cit}
                              onOpenPDF={(docName, pageNum, docId) =>
                                setActivePdfViewer({ docName, pageNumber: pageNum, docId })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-purple-300" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isGenerating && (
              <div className="flex gap-3 max-w-3xl mx-auto">
                <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/10 max-w-[85%] space-y-3">
                  {streamingText ? (
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingText}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-purple-300 font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Performing vector search & generating grounded response...
                    </div>
                  )}

                  {streamingCitations.length > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] text-purple-300 font-semibold mb-1 block">
                        Retrieved Document Sources:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {streamingCitations.map((cit, idx) => (
                          <CitationBadge
                            key={idx}
                            citation={cit}
                            onOpenPDF={(docName, pageNum, docId) =>
                              setActivePdfViewer({ docName, pageNumber: pageNum, docId })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10 glass-panel">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-3xl mx-auto relative flex items-center"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  selectedDocIds.length > 0
                    ? `Ask about ${selectedDocIds.length} selected document(s)...`
                    : 'Ask any question across your uploaded PDF documents...'
                }
                className="w-full bg-white/5 border border-white/15 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 shadow-inner transition-colors"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isGenerating}
                className="absolute right-2 p-2 rounded-xl gradient-bg text-white disabled:opacity-40 hover:scale-105 transition-all shadow-md shadow-purple-600/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[11px] text-center text-gray-500 mt-2">
              Answers are generated strictly using retrieved document context. Citations link directly to source PDF pages.
            </p>
          </div>
        </main>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchDocuments}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090a0f] text-white flex items-center justify-center p-8">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
