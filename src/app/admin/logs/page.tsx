'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Code2,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'blocked';
  metadata: Record<string, any>;
  timestamp: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async (targetPage = page) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', targetPage.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/admin/logs?${params.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.logs && Array.isArray(json.logs)) {
          setLogs(json.logs);
          setTotalLogs(json.totalLogs || json.logs.length);
          setTotalPages(json.totalPages || 1);
          setPage(json.page || targetPage);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> SUCCESS
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" /> FAILED
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="h-3 w-3 text-amber-600" /> BLOCKED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827] flex items-center gap-2.5">
            <ScrollText className="h-6 w-6 text-[#0e6de4]" />
            Super Admin Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Immutable server-side audit log of administrative actions, role modifications, queue changes, and API key updates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs(page)}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0758bd] disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Feed
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, email, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-[#111827] placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-100 focus:outline-none transition shadow-2xs"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:border-[#0e6de4] focus:outline-none shadow-2xs cursor-pointer flex-1 md:flex-initial"
          >
            <option value="all">All Actions</option>
            <option value="admin_login_success">Admin Login Success</option>
            <option value="integration_updated">Integration Updated</option>
            <option value="campaign_settings_saved">Campaign Settings Saved</option>
            <option value="secret_configured">Secret Configured</option>
            <option value="emergency_controls_triggered">Emergency Controls</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:border-[#0e6de4] focus:outline-none shadow-2xs cursor-pointer flex-1 md:flex-initial"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#111827]">
            Immutable Event Trail ({totalLogs} recorded)
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-200/60 px-2.5 py-1 rounded-md">
            Page {page} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="px-6 py-4">Timestamp (UTC)</th>
                <th className="px-5 py-4">Admin Actor</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Resource</th>
                <th className="px-5 py-4">IP Address</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-600 whitespace-nowrap align-middle">
                    {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap align-middle">
                    <span className="font-bold text-[#111827]">{log.userEmail}</span>
                  </td>

                  <td className="px-5 py-4 font-mono font-extrabold text-[#0e6de4] text-[11px] whitespace-nowrap align-middle">
                    {log.action}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap align-middle">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-700">
                      {log.resourceType}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-mono text-[11px] text-slate-600 font-semibold whitespace-nowrap align-middle">
                    {log.ipAddress}
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap align-middle">
                    {getStatusBadge(log.status)}
                  </td>

                  <td className="px-6 py-4 text-right whitespace-nowrap align-middle">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0e6de4] hover:bg-blue-50 border border-blue-200 transition cursor-pointer"
                    >
                      <Code2 className="h-3.5 w-3.5" /> View JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Showing page <span className="font-bold text-slate-700">{page}</span> of <span className="font-bold text-slate-700">{totalPages}</span> ({totalLogs} total events)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => fetchLogs(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => fetchLogs(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#111827] font-mono">
                Audit Payload: {selectedLog.action}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-medium">
              <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                <span>Actor:</span>
                <span className="font-bold text-[#111827]">{selectedLog.userEmail}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                <span>Timestamp (UTC):</span>
                <span className="font-mono font-bold text-slate-800">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5 text-slate-600">
                <span>Client IP Address:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.ipAddress}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Resource ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.resourceId || 'global'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-extrabold text-[#111827]">Sanitized JSON Metadata (Zero Secrets):</p>
              <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Close Payload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
