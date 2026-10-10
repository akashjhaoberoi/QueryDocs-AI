'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { StatusBadge } from '@/components/status-badge';
import { DocumentRecord } from '@/lib/db/documents';
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  Cpu,
  HardDrive,
  Scan,
  RefreshCw,
  Trash2,
  Eye,
  Activity,
} from 'lucide-react';

export default function AdminPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (e) {
      console.warn('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const totalStorageMB = (
    documents.reduce((acc, curr) => acc + (curr.file_size || 0), 0) / (1024 * 1024)
  ).toFixed(2);
  const failureCount = documents.filter((d) => d.processing_status === 'failed').length;
  const ocrCount = documents.filter((d) => d.ocr_used).length;

  const handleDelete = async (id: string) => {
    if (!confirm('Admin action: Are you sure you want to purge this document?')) return;
    try {
      await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
      fetchAdminStats();
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
      fetchAdminStats();
    } catch (e) {
      console.error('Reprocess error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Shield className="w-7 h-7 text-purple-400" />
              Admin Platform Oversight
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              System health monitoring, user document audit, and vector storage oversight.
            </p>
          </div>

          <button
            onClick={fetchAdminStats}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Metrics
          </button>
        </div>

        {/* System Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Users', val: '1', icon: Users, color: 'text-purple-400' },
            { label: 'Total Documents', val: documents.length, icon: FileText, color: 'text-indigo-400' },
            { label: 'Processing Failures', val: failureCount, icon: AlertTriangle, color: 'text-rose-400' },
            { label: 'Storage Used', val: `${totalStorageMB} MB`, icon: HardDrive, color: 'text-cyan-400' },
            { label: 'OCR Usage', val: `${ocrCount} docs`, icon: Scan, color: 'text-amber-400' },
            { label: 'Token Estimate', val: '45.2K', icon: Cpu, color: 'text-emerald-400' },
          ].map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[11px] font-medium">{m.label}</span>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <span className="text-2xl font-extrabold text-white">{m.val}</span>
              </div>
            );
          })}
        </div>

        {/* Platform Document Oversight Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              All System Documents ({documents.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              Loading admin records...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3.5">Document</th>
                    <th className="px-6 py-3.5">User ID</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Pages</th>
                    <th className="px-6 py-3.5">Error Log</th>
                    <th className="px-6 py-3.5 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="truncate max-w-xs">{doc.file_name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{doc.user_id}</td>

                      <td className="px-6 py-4">
                        <StatusBadge status={doc.processing_status} ocrUsed={doc.ocr_used} />
                      </td>

                      <td className="px-6 py-4 font-mono">{doc.page_count || 1}</td>

                      <td className="px-6 py-4 text-xs font-mono text-rose-300">
                        {doc.error_message ? doc.error_message : 'None'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                            title="Inspect"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleReprocess(doc.id)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                            title="Reprocess"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300"
                            title="Delete"
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
    </div>
  );
}
