'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { UploadModal } from '@/components/upload-modal';
import {
  FileText,
  Search,
  Bot,
  FileCheck,
  Scan,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle,
} from 'lucide-react';

export default function LandingPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col relative overflow-hidden">
      <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-96 left-10 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by pgvector & Multi-Model LLM RAG
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Chat With Your <span className="gradient-text">PDF Documents</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
          Upload PDFs, ask natural-language questions, and get accurate, grounded answers backed by precise document page citations.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-7 py-3.5 rounded-2xl gradient-bg font-semibold text-sm shadow-xl shadow-purple-600/30 hover:scale-[1.03] transition-all flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-7 py-3.5 rounded-2xl glass-card font-semibold text-sm hover:bg-white/10 transition-all border border-white/15 flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-purple-400" />
            Try Live Demo
          </button>
        </div>

        {/* Interactive App Preview Mockup */}
        <div className="mt-14 max-w-5xl mx-auto glass-panel p-4 md:p-6 rounded-3xl border border-white/10 shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-gray-400 font-mono ml-2">documind-rag.app/chat</span>
            </div>
            <span className="text-[11px] text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              pgvector similarity: 0.94
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="glass-card p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-purple-300">
                <FileText className="w-4 h-4 text-purple-400" />
                Selected PDF Context
              </div>
              <p className="text-xs text-gray-300 font-mono bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                📄 admission-guidelines-2026.pdf<br />
                &quot;Page 7: Candidates must hold a minimum bachelor degree with 60% aggregate marks...&quot;
              </p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-white/10 md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-400">
                  <Bot className="w-4 h-4" />
                  Grounded RAG Response
                </div>
                <p className="text-xs text-gray-200 leading-relaxed font-sans">
                  The minimum qualification required is a bachelor&apos;s degree with at least 60% aggregate marks. Applications close on October 31st.
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-purple-300 font-medium">Source Citation:</span>
                <span className="bg-purple-600/30 text-purple-200 px-2.5 py-1 rounded-lg border border-purple-500/30 font-semibold cursor-pointer">
                  📄 admission-guidelines.pdf — Page 7
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 max-w-7xl mx-auto border-t border-white/10 relative z-10">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Built for Enterprise-Grade <span className="gradient-text">PDF Intelligence</span>
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Everything you need to retrieve insights from technical papers, legal contracts, and scanned forms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: FileText,
              title: 'Multi-PDF Upload',
              desc: 'Upload multiple documents simultaneously with drag-and-drop support up to 25MB.',
            },
            {
              icon: Search,
              title: 'Vector Similarity Search',
              desc: 'Powered by PostgreSQL & pgvector with HNSW cosine index filtering by authenticated user.',
            },
            {
              icon: Bot,
              title: 'Grounded AI Answers',
              desc: 'LLMs generate answers strictly from supplied document context with zero hallucination guarantee.',
            },
            {
              icon: FileCheck,
              title: 'Page-Level Citations',
              desc: 'Every response includes exact document name and page citations linking directly to the embedded viewer.',
            },
            {
              icon: Scan,
              title: 'Hindi & English OCR',
              desc: 'Automatic detection for scanned PDFs with high-precision Tesseract OCR supporting Hindi & English.',
            },
            {
              icon: ShieldCheck,
              title: 'Private & Secure RLS',
              desc: 'Row-Level Security isolates vector chunks. User data and documents are strictly compartmentalized.',
            },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="glass-card p-6 rounded-2xl flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 max-w-7xl mx-auto border-t border-white/10 relative z-10">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-white">How It Works</h2>
          <p className="text-xs text-gray-400 mt-1">4 simple steps from raw PDF to accurate cited answers</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Upload PDF', desc: 'Drag and drop normal or scanned PDF files.' },
            { step: '02', title: 'Process & OCR', desc: 'Text extraction, OCR, and semantic vector chunking.' },
            { step: '03', title: 'Ask Questions', desc: 'Query across all or specific selected documents.' },
            { step: '04', title: 'Get Cited Answers', desc: 'Receive grounded answers with clickable page sources.' },
          ].map((s, idx) => (
            <div key={idx} className="glass-card p-6 rounded-2xl relative overflow-hidden">
              <span className="text-4xl font-black text-purple-500/20 absolute top-3 right-4">
                {s.step}
              </span>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-white text-base">{s.title}</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upload Modal Trigger */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-8 px-4 text-center text-xs text-gray-500 glass-panel">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-bg flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">DocuMind RAG</span>
          </div>
          <p>© 2026 DocuMind RAG SaaS. Built with Next.js, Supabase & pgvector.</p>
          <div className="flex gap-4 text-gray-400">
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link href="/chat" className="hover:text-white">Chat</Link>
            <Link href="/admin" className="hover:text-white">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
