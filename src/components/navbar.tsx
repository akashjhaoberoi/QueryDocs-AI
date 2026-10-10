'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MessageSquare, LayoutDashboard, Shield, Upload, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  onOpenUpload?: () => void;
}

export function Navbar({ onOpenUpload }: NavbarProps) {
  const pathname = usePathname();
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; provider: string; statusText: string } | null>(null);

  useEffect(() => {
    fetch('/api/health/ai')
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) {
          setAiStatus({
            configured: true,
            provider: data.provider || 'AI',
            statusText: 'AI Assistant Ready',
          });
        } else {
          setAiStatus({
            configured: false,
            provider: data.provider || 'AI',
            statusText: 'AI Service Unavailable',
          });
        }
      })
      .catch(() => {
        setAiStatus({
          configured: false,
          provider: 'AI',
          statusText: 'AI Service Unavailable',
        });
      });
  }, []);

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'RAG Chat', href: '/chat', icon: MessageSquare },
    { name: 'Admin', href: '/admin', icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
              DocuMind <span className="gradient-text font-black">RAG</span>
            </span>
            <span className="text-[10px] text-purple-300/70 font-medium tracking-wider uppercase">PDF Intelligence</span>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Status & CTA */}
        <div className="flex items-center gap-3">
          {aiStatus && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                aiStatus.configured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
              title={aiStatus.configured ? `Connected to ${aiStatus.provider.toUpperCase()}` : 'LLM API Key missing in environment variables'}
            >
              {aiStatus.configured ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{aiStatus.statusText}</span>
            </div>
          )}

          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload PDF</span>
            </button>
          )}

          <div className="w-9 h-9 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-xs font-semibold text-purple-200">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
