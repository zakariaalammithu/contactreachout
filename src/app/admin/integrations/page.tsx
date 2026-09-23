'use client';

export const dynamic = 'force-dynamic';

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
  CreditCard,
  TriangleAlert,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any>(null);
  const [hasRuntimeOnlySecrets, setHasRuntimeOnlySecrets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);
        if (data.hasRuntimeOnlySecrets !== undefined) {
          setHasRuntimeOnlySecrets(data.hasRuntimeOnlySecrets);
        }
      }
    } catch (err) {
      console.error('Failed to fetch integration statuses:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStatus();
  };

  const cards = [
    {
      id: 'stripe',
      title: 'Stripe Payments',
      desc: 'Server-side payment credential for secure credit-package checkout processing.',
      icon: CreditCard,
      href: '/admin/billing/transactions',
      status: isLoading ? 'CHECKING' : integrations?.stripe?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.stripe?.maskedKey || 'NOT_CONFIGURED',
    },
    {
      id: 'email',
      title: 'Resend Transactional Email',
      desc: 'High-deliverability transactional notifications, lead report summaries, and queue event alerts.',
      icon: Mail,
      href: '/admin/integrations/email',
      status: isLoading ? 'CHECKING' : integrations?.resend?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.resend?.maskedKey || 'NOT_CONFIGURED',
    },
    {
      id: 'googleSheets',
      title: 'Google Sheets OAuth & Sync',
      desc: 'Bidirectional synchronization for spreadsheet lead ingestion and live status writebacks.',
      icon: FileSpreadsheet,
      href: '/admin/integrations/google-sheets',
      status: isLoading ? 'CHECKING' : integrations?.googleSheets?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.googleSheets?.maskedKey || 'NOT_CONFIGURED',
    },
    {
      id: 'ai',
      title: 'AI Personalization (OpenAI / Anthropic)',
      desc: 'Optional public company signal synthesis with enforced anti-hallucination and CAN-SPAM truthfulness.',
      icon: Bot,
      href: '/admin/integrations/ai',
      status: isLoading ? 'CHECKING' : integrations?.ai?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.ai?.maskedKey || 'NOT_CONFIGURED',
    },
    {
      id: 'supabase',
      title: 'Supabase PostgreSQL & Auth',
      desc: 'Primary multi-tenant relational persistence with PostgreSQL Row-Level Security policies active.',
      icon: Database,
      href: '/admin/system/health',
      status: isLoading ? 'CHECKING' : integrations?.supabase?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.supabase?.maskedKey || 'NOT_CONFIGURED',
    },
    {
      id: 'redis',
      title: 'Redis Queue Broker',
      desc: 'In-memory BullMQ message broker governing worker job dispatch and concurrency limits.',
      icon: Layers,
      href: '/admin/system/queue',
      status: isLoading ? 'CHECKING' : integrations?.redis?.status || 'NOT_CONFIGURED',
      maskedKey: integrations?.redis?.maskedKey || 'NOT_CONFIGURED',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Plug className="h-5 w-5" />
            </div>
            <span>API & Integrations Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized hub for managing external cloud services, OAuth tokens, and server-side encrypted credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4] animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4]" />
                Refresh Status
              </>
            )}
          </Button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs font-bold text-[#0e6de4]">
            <ShieldCheck className="h-4 w-4 text-[#0e6de4]" />
            <span>AES-256-GCM Vault Active</span>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {hasRuntimeOnlySecrets && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed shadow-xs animate-in fade-in duration-150">
          <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
          <p>
            <strong className="font-bold">Runtime Credentials Active:</strong> Dashboard-saved credentials are encrypted in memory vault. Configure production keys in Vercel Environment Variables so they persist across serverless cold restarts.
          </p>
        </div>
      )}

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const status = card.status;
          const isConnected = status === 'CONNECTED';
          const isChecking = status === 'CHECKING';
          const isError = status === 'ERROR';

          return (
            <Card
              key={card.id}
              className="p-5 flex flex-col justify-between space-y-4 border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-[#0e6de4] border border-blue-100 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      isChecking
                        ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
                        : isConnected
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isError
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{card.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 text-[11px]">Vault Key:</span>
                  <span className="text-slate-800 font-bold">{card.maskedKey}</span>
                </div>

                <Link href={card.href} className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold justify-between border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#0e6de4]"
                  >
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
