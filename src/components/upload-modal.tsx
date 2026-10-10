'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

interface UploadItem {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    const newItems: UploadItem[] = [];
    const maxSizeBytes = 25 * 1024 * 1024;

    Array.from(files).forEach((file) => {
      // PDF type check
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        newItems.push({
          id: Math.random().toString(),
          file,
          status: 'error',
          progress: 0,
          error: 'Only PDF documents are supported.',
        });
        return;
      }

      // Size check
      if (file.size > maxSizeBytes) {
        newItems.push({
          id: Math.random().toString(),
          file,
          status: 'error',
          progress: 0,
          error: 'File size exceeds maximum 25MB limit.',
        });
        return;
      }

      newItems.push({
        id: `${file.name}_${Date.now()}_${Math.random()}`,
        file,
        status: 'uploading',
        progress: 20,
      });
    });

    setItems((prev) => [...prev, ...newItems]);

    // Start uploading items
    for (const item of newItems) {
      if (item.status === 'error') continue;
      await uploadFileItem(item);
    }

    if (onUploadSuccess) {
      onUploadSuccess();
    }
  };

  const uploadFileItem = async (item: UploadItem) => {
    try {
      const formData = new FormData();
      formData.append('file', item.file);

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'processing', progress: 60 } : i))
      );

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Upload failed');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'success', progress: 100 } : i))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload error';
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: msg, progress: 0 } : i))
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              Upload PDF Documents
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Upload normal or scanned PDFs. Hindi and English OCR supported.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
              : 'border-white/15 bg-white/5 hover:border-purple-500/50 hover:bg-white/[0.07]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
            <Upload className="w-7 h-7 text-white" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">
            Drag & drop PDF files here, or <span className="text-purple-400 underline">browse</span>
          </p>
          <p className="text-xs text-gray-400">
            Supports multiple PDFs up to 25MB each
          </p>
        </div>

        {/* Upload List */}
        {items.length > 0 && (
          <div className="mt-6 max-h-56 overflow-y-auto space-y-3 pr-1">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Upload Queue ({items.length})
            </h4>
            {items.map((item) => (
              <div
                key={item.id}
                className="glass-card p-3 rounded-xl flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-purple-900/40 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{item.file.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'uploading' && (
                    <span className="text-xs text-blue-400 animate-pulse font-medium">Uploading...</span>
                  )}
                  {item.status === 'processing' && (
                    <span className="text-xs text-purple-400 animate-pulse font-medium">Indexing RAG...</span>
                  )}
                  {item.status === 'success' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Ready
                    </span>
                  )}
                  {item.status === 'error' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-400 flex items-center gap-1" title={item.error}>
                        <AlertTriangle className="w-4 h-4" /> Failed
                      </span>
                      <button
                        onClick={() => uploadFileItem(item)}
                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                        title="Retry upload"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
