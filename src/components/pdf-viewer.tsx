'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Search,
  FileText,
  X,
} from 'lucide-react';

interface PDFViewerProps {
  documentName: string;
  fileUrl?: string;
  initialPage?: number;
  totalPageCount?: number;
  extractedPages?: Array<{ page_number: number; extracted_text: string }>;
  documentId?: string;
  onClose?: () => void;
}

export function PDFViewer({
  documentName,
  initialPage = 1,
  documentId,
  onClose,
}: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const pdfUrl = documentId ? `/api/documents/${documentId}/pdf#page=${initialPage}` : '';

  return (
    <div
      className={`glass-panel rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 bg-[#323639]' : 'h-[650px] w-full'
      }`}
    >
      {/* Viewer Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-semibold text-sm text-white truncate">{documentName}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 text-xs">
          <a
            href={documentId ? `/api/documents/${documentId}/pdf` : '#'}
            download={`${documentName}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white"
            title="Toggle full screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Document Native Viewport */}
      <div className="flex-1 bg-[#525659] w-full h-full relative">
        {!pdfUrl ? (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <p>Unable to load PDF: Missing Document ID</p>
          </div>
        ) : (
          <iframe 
            src={pdfUrl} 
            className="w-full h-full border-0" 
            title={documentName}
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
}
