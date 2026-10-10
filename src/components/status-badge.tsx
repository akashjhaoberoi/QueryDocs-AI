import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Scan, Cpu, Layers } from 'lucide-react';

export type ProcessingStatus = 'uploading' | 'processing' | 'extracting' | 'ocr' | 'embedding' | 'indexed' | 'failed';

interface StatusBadgeProps {
  status: ProcessingStatus;
  ocrUsed?: boolean;
}

export function StatusBadge({ status, ocrUsed }: StatusBadgeProps) {
  const config = {
    uploading: { label: 'Uploading', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Loader2, spin: true },
    processing: { label: 'Processing', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Cpu, spin: true },
    extracting: { label: 'Extracting Text', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', icon: Layers, spin: true },
    ocr: { label: 'OCR Processing', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Scan, spin: true },
    embedding: { label: 'Creating Embeddings', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', icon: Cpu, spin: true },
    indexed: { label: 'Indexed', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, spin: false },
    failed: { label: 'Failed', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: AlertCircle, spin: false },
  };

  const curr = config[status] || config.processing;
  const Icon = curr.icon;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${curr.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${curr.spin ? 'animate-spin' : ''}`} />
        {curr.label}
      </span>
      {ocrUsed && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          OCR
        </span>
      )}
    </div>
  );
}
