'use client';

import React, { useState } from 'react';
import { FileCheck, Camera, CheckCircle2, ShieldAlert, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminSubmissionsPage() {
  const [selectedProof, setSelectedProof] = useState<any | null>(null);

  const submissions = [
    { id: 'sub-01', company: 'Acme Cloud Dynamics', targetUrl: 'https://acmeclouddynamics.com/contact', status: 'SUCCESS', mode: 'TEST_MODE', timestamp: '2026-08-12 18:24:12', latencyMs: 1420 },
    { id: 'sub-02', company: 'Nexus Logistics AI', targetUrl: 'https://nexuslogistics.io/contact-us', status: 'SUCCESS', mode: 'TEST_MODE', timestamp: '2026-08-12 18:24:18', latencyMs: 1890 },
    { id: 'sub-03', company: 'Vanguard Security Corp', targetUrl: 'https://vanguardsec.com/contact-sales', status: 'CAPTCHA_TRIGGERED', mode: 'HALTED_FOR_REVIEW', timestamp: '2026-08-12 18:24:24', latencyMs: 920 },
    { id: 'sub-04', company: 'CloudScale UK Ltd', targetUrl: 'https://cloudscaleuk.co.uk/get-in-touch', status: 'SUCCESS', mode: 'TEST_MODE', timestamp: '2026-08-12 18:24:31', latencyMs: 1640 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-emerald-400" />
            Global Submissions & Visual Proof Vault
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Audit pre-submission fill verifications, confirmation texts, and visual screenshot proofs.
          </p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090D16] border-b border-white/[0.08] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Target Destination</th>
                <th className="px-5 py-3.5">Submission Mode</th>
                <th className="px-5 py-3.5">Outcome</th>
                <th className="px-5 py-3.5">Execution Latency</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {submissions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-white">{s.company}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{s.targetUrl}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-300">{s.mode}</td>
                  <td className="px-5 py-3.5">
                    {s.status === 'SUCCESS' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        SUCCESS
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {s.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-300">{s.latencyMs} ms</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">{s.timestamp}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProof(s)}
                      className="h-7 text-xs"
                    >
                      <Camera className="h-3 w-3 mr-1 text-purple-400" />
                      View Proof
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-lg p-6 space-y-4 border-slate-700 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-purple-400" />
                Proof of Execution: {selectedProof.company}
              </h3>
              <button onClick={() => setSelectedProof(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Camera className="h-8 w-8 text-slate-600" />
              <p className="text-xs font-mono">Visual Proof Captured • SHA-256 Verified</p>
              <p className="text-[11px] text-slate-600 font-mono">{selectedProof.targetUrl}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedProof(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
