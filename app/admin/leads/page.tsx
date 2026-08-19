'use client';

import React, { useState } from 'react';
import { Database, Search, Globe, Building2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminLeadsPage() {
  const [search, setSearch] = useState('');

  const leads = [
    { id: 'lead-01', company: 'Acme Cloud Dynamics', website: 'https://acmeclouddynamics.com', contactUrl: '/contact', email: 'hello@acmeclouddynamics.com', status: 'SUBMITTED', score: 0.95 },
    { id: 'lead-02', name: 'Nexus Logistics AI', website: 'https://nexuslogistics.io', contactUrl: '/support/contact-us', email: 'sales@nexuslogistics.io', status: 'SUBMITTED', score: 0.92 },
    { id: 'lead-03', name: 'Vanguard Security Corp', website: 'https://vanguardsec.com', contactUrl: '/contact-sales', email: 'info@vanguardsec.com', status: 'REVIEW_REQUIRED', score: 0.88 },
    { id: 'lead-04', name: 'CloudScale UK Ltd', website: 'https://cloudscaleuk.co.uk', contactUrl: '/get-in-touch', email: 'team@cloudscaleuk.co.uk', status: 'SUBMITTED', score: 0.96 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-cyan-400" />
            Global Leads Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Browse discovered domains, contact page heuristics, and field mapping confidence scores.
          </p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090D16] border-b border-white/[0.08] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Company & Domain</th>
                <th className="px-5 py-3.5">Discovered Page</th>
                <th className="px-5 py-3.5">Recipient</th>
                <th className="px-5 py-3.5">Confidence</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-white">{l.company || l.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{l.website}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-indigo-400">{l.contactUrl}</td>
                  <td className="px-5 py-3.5 text-slate-400">{l.email}</td>
                  <td className="px-5 py-3.5 font-mono text-emerald-400 font-bold">{Math.round(l.score * 100)}%</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {l.status}
                    </span>
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
