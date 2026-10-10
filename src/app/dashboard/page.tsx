'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { UploadModal } from '@/components/upload-modal';
import { StatusBadge } from '@/components/status-badge';
import { DocumentRecord } from '@/lib/db/documents';
import {
  FileText,
  MessageSquare,
  Trash2,
  RefreshCw,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  Download,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    processedDocuments: 0,
    processingDocuments: 0,
    totalPages: 0,
    totalIndexedChunks: 0,
    questionsAsked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
        setStats(data.stats);
      }
    } catch (e) {
      console.warn('Error fetching dashboard documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document and all its vector chunks?')) return;
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: id }),
      });
      fetchDocuments();
    } catch (e) {
      console.error('Reprocess error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col">
      <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-purple-400" />
              Document Library
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Manage uploaded PDFs, inspect vector indexing status, and run RAG queries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white flex items-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Open RAG Chat
            </Link>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2.5 rounded-xl gradient-bg text-sm font-semibold text-white shadow-lg shadow-purple-600/20 flex items-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Plus className="w-4 h-4" />
              Upload PDF
            </button>
          </div>
        </div>

        {/* Analytics Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Documents', val: stats.totalDocuments, icon: FileText, color: 'text-purple-400' },
            { label: 'Processed', val: stats.processedDocuments, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Processing', val: stats.processingDocuments, icon: Clock, color: 'text-amber-400' },
            { label: 'Total Pages', val: stats.totalPages, icon: Layers, color: 'text-indigo-400' },
            { label: 'Indexed Chunks', val: stats.totalIndexedChunks, icon: Layers, color: 'text-cyan-400' },
            { label: 'Questions Asked', val: stats.questionsAsked, icon: HelpCircle, color: 'text-pink-400' },
          ].map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[11px] font-medium">{s.label}</span>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <span className="text-2xl font-extrabold text-white">{s.val}</span>
              </div>
            );
          })}
        </div>

        {/* Document Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              Uploaded Documents ({documents.length})
            </h3>
            <button
              onClick={fetchDocuments}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Refresh table"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              Loading document index...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
              <h4 className="text-lg font-bold text-white">No PDF Documents Uploaded</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-6">
                Upload your first PDF document to start chunking, pgvector indexing, and AI question answering.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-6 py-2.5 rounded-xl gradient-bg text-sm font-semibold text-white shadow-lg shadow-purple-600/20 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Upload PDF Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3.5">Document</th>
                    <th className="px-6 py-3.5">Pages</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Chunks</th>
                    <th className="px-6 py-3.5">Uploaded</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-900/40 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <Link
                              href={`/documents/${doc.id}`}
                              className="font-semibold text-white hover:text-purple-300 transition-colors"
                            >
                              {doc.file_name}
                            </Link>
                            <p className="text-[11px] text-gray-400">
                              {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-gray-300">{doc.page_count || 1}</td>

                      <td className="px-6 py-4">
                        <StatusBadge status={doc.processing_status} ocrUsed={doc.ocr_used} />
                      </td>

                      <td className="px-6 py-4 font-mono text-purple-300 font-semibold">
                        {doc.processing_status === 'indexed' ? 'Indexed' : '-'}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/chat?docId=${doc.id}`}
                            className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Ask
                          </Link>

                          <Link
                            href={`/documents/${doc.id}`}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                            title="Inspect Details & View PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleReprocess(doc.id)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                            title="Reprocess & Re-index PDF"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchDocuments}
      />
    </div>
  );
}
