'use client';

import React from 'react';
import { FileText, ExternalLink, Sparkles } from 'lucide-react';
import { Citation } from '@/lib/db/conversations';

interface CitationBadgeProps {
  citation: Citation;
  onOpenPDF: (docName: string, pageNumber: number, docId?: string) => void;
}

export function CitationBadge({ citation, onOpenPDF }: CitationBadgeProps) {
  return (
    <div
      onClick={() => onOpenPDF(citation.documentName, citation.pageNumber, citation.documentId)}
      className="glass-card p-3 rounded-xl cursor-pointer group hover:border-purple-500/50 flex flex-col gap-1.5 transition-all"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-purple-300 group-hover:text-purple-200">
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span className="truncate max-w-[180px]">{citation.documentName}</span>
          <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-purple-500/30">
            Page {citation.pageNumber}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-white">
          {citation.similarity && (
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              {Math.round(citation.similarity * 100)}%
            </span>
          )}
          <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-purple-400 transition-colors" />
        </div>
      </div>

      {citation.snippet && (
        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed italic bg-black/20 p-1.5 rounded">
          &quot;{citation.snippet}&quot;
        </p>
      )}
    </div>
  );
}
