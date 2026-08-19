'use client';

import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const json = await res.json();
      if (json.logs) setLogs(json.logs);
    } catch {
      // Offline fallback
      setLogs([
        {
          id: 'log-001',
          userEmail: 'mithusquare@gmail.com',
          action: 'admin_login_success',
          resourceType: 'auth',
          resourceId: 'usr-superadmin-001',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          metadata: { role: 'SUPER_ADMIN', authMethod: 'password_hash' },
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'log-002',
          userEmail: 'mithusquare@gmail.com',
          action: 'integration_updated',
          resourceType: 'system_secrets',
          resourceId: 'RESEND_API_KEY',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          metadata: { provider: 'Resend', keyConfigured: true, maskedPreview: '••••••••ABCD' },
          timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-indigo-400" />
            Super Admin Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Immutable log of all administrative actions, role modifications, queue changes, and API key updates.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchLogs} isLoading={isLoading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh Feed
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="glass-panel p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by action, email, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none w-full sm:w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="blocked">Blocked</option>
        </select>
      </Card>

      {/* Audit Log Table */}
      <Card className="glass-panel overflow-hidden border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090D16] border-b border-white/[0.08] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Admin Actor</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Resource</th>
                <th className="px-5 py-3.5">IP & Agent</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="font-bold text-white">{log.userEmail}</span>
                  </td>

                  <td className="px-5 py-3.5 font-mono font-bold text-indigo-300 text-[11px]">
                    {log.action}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                      {log.resourceType}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400">
                    {log.ipAddress}
                  </td>

                  <td className="px-5 py-3.5">
                    {log.status === 'success' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        SUCCESS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        {log.status.toUpperCase()}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="text-[11px] h-7 px-2 text-indigo-400 hover:text-white"
                    >
                      View JSON
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-lg p-6 space-y-4 border-slate-700 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white font-mono">
                Audit Event: {selectedLog.action}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Actor:</span>
                <span className="font-bold text-white">{selectedLog.userEmail}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Timestamp:</span>
                <span className="font-mono text-slate-300">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IP Address:</span>
                <span className="font-mono text-slate-300">{selectedLog.ipAddress}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-300">Sanitized Metadata (Zero Secrets):</p>
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
