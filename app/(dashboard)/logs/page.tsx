'use client';

import React, { useState } from 'react';
import { ScrollText, Search, Filter, RefreshCw, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { mockLogs } from '@/lib/store/mock-data';
import { formatDate } from '@/lib/utils';

export default function LogsPage() {
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = mockLogs.filter((log) => {
    const matchesLevel = levelFilter === 'ALL' || log.level.toUpperCase() === levelFilter;
    const matchesSearch =
      log.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.domain && log.domain.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System & Worker Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Distributed execution telemetry, browser events, and anti-bot challenge traces.
          </p>
        </div>

        <Button variant="secondary" size="sm">
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh Telemetry
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Trace ID, domain, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                levelFilter === lvl
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-slate-800 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <Card className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-muted-foreground border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold">Level</th>
                <th className="p-4 font-semibold">Trace ID</th>
                <th className="p-4 font-semibold">Domain</th>
                <th className="p-4 font-semibold">Phase / Step</th>
                <th className="p-4 font-semibold">Event Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        log.level === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.level === 'warn'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="p-4 text-primary font-bold">{log.traceId}</td>
                  <td className="p-4 text-white font-semibold">{log.domain || '—'}</td>
                  <td className="p-4 text-indigo-400">{log.step}</td>
                  <td className="p-4 max-w-lg truncate text-slate-200">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
