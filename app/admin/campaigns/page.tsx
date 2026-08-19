'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send, Search, Filter, Play, Pause, XCircle, Sparkles, Database, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminCampaignsPage() {
  const [search, setSearch] = useState('');

  const campaigns = [
    { id: 'camp-01', name: 'US SaaS CTO Outreach Q3', org: 'Acme Growth', totalLeads: 2400, processed: 1850, successRate: '98.2%', status: 'running' },
    { id: 'camp-02', name: 'UK E-Commerce Founders Direct', org: 'Alpha Outreach', totalLeads: 1200, processed: 1200, successRate: '96.5%', status: 'completed' },
    { id: 'camp-03', name: 'Australia Logistics Logistics Leaders', org: 'Pacifica Corp', totalLeads: 850, processed: 320, successRate: '99.0%', status: 'running' },
    { id: 'camp-04', name: 'Nordics FinTech Discovery', org: 'Nordic Scale', totalLeads: 1500, processed: 0, successRate: '—', status: 'ready' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Send className="h-6 w-6 text-purple-400" />
            Global Tenant Campaigns Inspector
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Monitor and govern all active outreach campaigns across all organizations.
          </p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090D16] border-b border-white/[0.08] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Campaign Name</th>
                <th className="px-5 py-3.5">Organization</th>
                <th className="px-5 py-3.5">Progress</th>
                <th className="px-5 py-3.5">Success Rate</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-white">{c.name}</td>
                  <td className="px-5 py-3.5 text-slate-400">{c.org}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-300">
                    {c.processed} / {c.totalLeads} ({Math.round((c.processed / c.totalLeads) * 100)}%)
                  </td>
                  <td className="px-5 py-3.5 font-mono text-emerald-400 font-bold">{c.successRate}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
