'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { StatusBadge } from '@/components/status-badge';
import { PDFViewer } from '@/components/pdf-viewer';
import { DocumentRecord } from '@/lib/db/documents';
import { ChunkRecord } from '@/lib/db/chunks';
import {
  FileText,
  MessageSquare,
  RefreshCw,
  Layers,
  ArrowLeft,
  Scan,
  Cpu,
  CheckCircle2,
  Calendar,
  HardDrive,
} from 'lucide-react';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [chunks, setChunks] = useState<ChunkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      if (res.ok && data.document) {
        setDocument(data.document);
        setChunks(data.chunks || []);
      } else {
        setError(data.error || 'Document not found');
      }
    } catch (e) {
      console.warn('Error fetching document detail:', e);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleReprocess = async () => {
    try {
      await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: id }),
      });
      fetchDetail();
    } catch (e) {
      console.error('Reprocess failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-bold text-rose-400 mb-2">{error || 'Document Not Found'}</h2>
          <Link href="/dashboard" className="text-sm text-purple-400 underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReprocess}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reprocess Document
            </button>
            <Link
              href={`/chat?docId=${document.id}`}
              className="px-4 py-2 rounded-xl gradient-bg text-xs font-bold text-white shadow-lg shadow-purple-600/20 flex items-center gap-1.5 hover:scale-[1.02] transition-transform"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask This Document
            </Link>
          </div>
        </div>

        {/* Metadata Banner Card */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center shadow-xl shadow-purple-500/20 shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{document.file_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1 font-mono">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  {(document.file_size / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  {document.page_count || 1} Pages
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  {new Date(document.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={document.processing_status} ocrUsed={document.ocr_used} />
            <span className="text-[11px] text-gray-400 font-mono">
              Vector Index: {chunks.length} chunks generated
            </span>
          </div>
        </div>

        {/* PDF Viewer & Vector Chunks Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Integrated Interactive Canvas PDF Viewer */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Document Page Preview
            </h3>
            <PDFViewer
              documentName={document.file_name}
              documentId={document.id}
            />
          </div>

          {/* Indexed Chunks Inspector */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-base text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Indexed Vector Chunks ({chunks.length})
              </span>
              <span className="text-xs text-purple-300 font-mono">pgvector 1536-dim</span>
            </h3>

            <div className="glass-panel rounded-2xl border border-white/10 p-4 h-[650px] overflow-y-auto space-y-3">
              {chunks.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No chunks generated yet for this document. Click &quot;Reprocess Document&quot; above.
                </div>
              ) : (
                chunks.map((chunk, idx) => (
                  <div key={idx} className="glass-card p-4 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Chunk #{chunk.chunk_index} — Page {chunk.page_number}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded">
                        {(chunk.metadata?.section as string) || 'General'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 font-mono leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5">
                      {chunk.content}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                      <span>Token count: ~{Math.ceil(chunk.content.length / 4)}</span>
                      <span className="text-emerald-400">Embedding Stored ✓</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
