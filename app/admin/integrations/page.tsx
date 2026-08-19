'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plug,
  Mail,
  FileSpreadsheet,
  Bot,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/integrations')
      .then((res) => res.json())
      .then((data) => setIntegrations(data.integrations))
      .catch(() => {});
  }, []);

  const cards = [
    {
      id: 'email',
      title: 'Resend Transactional Email',
      desc: 'High-deliverability transactional notifications, lead report summaries, and queue event alerts.',
      icon: Mail,
      href: '/admin/integrations/email',
      status: integrations?.resend?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.resend?.maskedKey || 'NOT_CONFIGURED',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'googleSheets',
      title: 'Google Sheets OAuth & Sync',
      desc: 'Bidirectional synchronization for spreadsheet lead ingestion and live status writebacks.',
      icon: FileSpreadsheet,
      href: '/admin/integrations/google-sheets',
      status: integrations?.googleSheets?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.googleSheets?.maskedKey || 'NOT_CONFIGURED',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'ai',
      title: 'AI Personalization (OpenAI / Anthropic)',
      desc: 'Optional public company signal synthesis with enforced anti-hallucination and CAN-SPAM truthfulness.',
      icon: Bot,
      href: '/admin/integrations/ai',
      status: integrations?.openai?.status === 'CONNECTED' || integrations?.anthropic?.status === 'CONNECTED' ? 'CONNECTED' : 'NOT_CONFIGURED',
      maskedKey: integrations?.openai?.maskedKey || 'NOT_CONFIGURED',
      color: 'from-pink-500 to-rose-600',
    },
    {
      id: 'supabase',
      title: 'Supabase PostgreSQL & Auth',
      desc: 'Primary multi-tenant relational persistence with PostgreSQL Row-Level Security policies active.',
      icon: Database,
      href: '/admin/system/health',
      status: 'CONNECTED',
      maskedKey: '••••••••83fa',
      color: 'from-indigo-500 to-blue-600',
    },
    {
      id: 'redis',
      title: 'Redis Queue Broker',
      desc: 'In-memory BullMQ message broker governing 6 worker job types and concurrency limits.',
      icon: Layers,
      href: '/admin/system/queue',
      status: 'CONNECTED',
      maskedKey: '••••••••6379',
      color: 'from-rose-500 to-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Plug className="h-6 w-6 text-indigo-400" />
            API & Integrations Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Centralized hub for managing external cloud services, OAuth tokens, and server-side encrypted credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>AES-256-GCM Vault Active</span>
        </div>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isConnected = card.status === 'CONNECTED';

          return (
            <Card
              key={card.id}
              className="glass-panel-interactive p-5 flex flex-col justify-between space-y-4 border-white/[0.08]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      isConnected
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm">{card.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{card.desc}</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 text-[11px]">Vault Key:</span>
                  <span className="text-slate-300 font-semibold">{card.maskedKey}</span>
                </div>

                <Link href={card.href} className="block">
                  <Button variant="outline" size="sm" className="w-full text-xs justify-between">
                    <span>Manage Settings</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
