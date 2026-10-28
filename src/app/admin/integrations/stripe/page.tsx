'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Save,
  TestTube2,
  TriangleAlert,
  Server,
  Lock,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function StripeIntegrationPage() {
  const [apiKey, setApiKey] = useState('');
  const [masked, setMasked] = useState('NOT_CONFIGURED');
  const [source, setSource] = useState<'env' | 'global' | 'user' | 'none'>('none');
  const [sourceText, setSourceText] = useState('Managed via Server Environment');
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [priceIds, setPriceIds] = useState<Record<number, string>>({ 5000: '', 10000: '', 100000: '', 300000: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchConfig = () => {
    fetch('/api/admin/integrations/stripe')
      .then((r) => r.json())
      .then((data) => {
        setMasked(data.maskedApiKey || 'NOT_CONFIGURED');
        setSource(data.source || 'none');
        setSourceText(data.sourceText || 'Managed via Server Environment');
        setIsOverrideActive(Boolean(data.isOverrideActive));
        setWebhookConfigured(Boolean(data.webhookConfigured));
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const run = async (action: 'save' | 'test' | 'save_settings' | 'clear_override') => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/integrations/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, apiKey, webhookSecret, priceIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');

      if (data.maskedApiKey) setMasked(data.maskedApiKey);
      if (data.source) setSource(data.source);
      if (data.sourceText) setSourceText(data.sourceText);
      setIsOverrideActive(Boolean(data.isOverrideActive));

      if (action === 'save') {
        setApiKey('');
      }

      if (action === 'save_settings') {
        setWebhookSecret('');
        setPriceIds({ 5000: '', 10000: '', 100000: '', 300000: '' });
        setWebhookConfigured(true);
      }

      setStatus({ type: 'success', message: data.message });
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Request failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 font-sans">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/integrations"
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-zinc-100">
            <CreditCard className="h-6 w-6 text-violet-400" />
            Stripe Integration
          </h1>
          <p className="text-xs text-zinc-400">Configure billing Checkout and webhook signatures.</p>
        </div>
      </div>

      <Card className="space-y-5 border-zinc-800 bg-zinc-950 p-6 shadow-xs">
        {/* Connection & Credential Source Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Connection Status</span>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-900 text-emerald-300 border border-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Active
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Active Credential Source</span>
            <div className="mt-1">
              {isOverrideActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-900 text-amber-200 border border-amber-800">
                  <Lock className="h-3.5 w-3.5 text-amber-300" />
                  Custom Encrypted Vault Override
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-900 text-blue-400 border border-blue-900">
                  <Server className="h-3.5 w-3.5 text-blue-400" />
                  ✓ Managed via Server Environment
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Override / Status Banner */}
        {isOverrideActive ? (
          <div className="p-4 rounded-xl border border-amber-900 bg-amber-950 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <TriangleAlert className="h-4 w-4 text-amber-400 shrink-0" />
              <span>An encrypted runtime override is currently active.</span>
            </div>
            <p className="text-amber-300 leading-relaxed pl-6">
              This overrides the server environment key with a custom database-vault key (Preview: <code className="font-mono bg-amber-900 px-1 rounded font-bold">{masked}</code>).
            </p>
            <div className="pl-6 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => run('clear_override')}
                className="text-xs font-bold border-amber-800 text-amber-200 hover:bg-amber-900"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                Clear Custom Override (Revert to Server Environment)
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-blue-900 bg-blue-950/60 text-zinc-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-zinc-100">Stripe is currently using the secure server environment configuration.</p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                An API key does not need to be entered here unless you intentionally want to create a runtime encrypted override. (Preview: <code className="font-mono font-bold text-zinc-200">{masked}</code>)
              </p>
            </div>
          </div>
        )}

        {/* Key Form */}
        <div className="space-y-3 pt-2">
          <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
            <span>Custom Encrypted API Key (Optional Override)</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_••••••••••••••••••••••••"
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 font-mono placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
            />
          </label>
          <p className="text-[11px] text-zinc-400 font-mono">
            Leave blank to keep server environment configuration active.
          </p>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run('test')} className="font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-900">
              <TestTube2 className="mr-1.5 h-4 w-4 text-blue-400" />
              Test Connection
            </Button>
            <Button variant="primary" size="sm" disabled={busy || !apiKey} onClick={() => run('save')} className="font-bold bg-[#0e6de4] text-white hover:bg-[#0c5bc2]">
              <Save className="mr-1.5 h-4 w-4" />
              Save Key Override
            </Button>
          </div>
        </div>

        {/* Checkout & Webhooks */}
        <div className="border-t border-zinc-800 pt-5 space-y-4">
          <div>
            <p className="text-sm font-extrabold text-zinc-100">Stripe Checkout & Webhook Settings</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Webhook signing secret status: <span className="font-bold text-zinc-200">{webhookConfigured ? '✓ Configured' : 'Not Configured'}</span> (Endpoint: <code className="font-mono text-zinc-200">/api/billing/webhook</code>)
            </p>
          </div>

          <label className="block space-y-1.5 text-xs font-bold text-zinc-300">
            <span>Webhook Signing Secret</span>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_••••••••••••••••••••••••"
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 font-mono placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {[5000, 10000, 100000, 300000].map((credits) => (
              <label key={credits} className="block space-y-1.5 text-xs font-bold text-zinc-300">
                <span>{credits.toLocaleString()} Credits Price ID</span>
                <input
                  type="password"
                  value={priceIds[credits]}
                  onChange={(e) => setPriceIds((current) => ({ ...current, [credits]: e.target.value }))}
                  placeholder="price_••••••••••••••••"
                  autoComplete="off"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 font-mono placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        {status && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
              status.type === 'success'
                ? 'border-emerald-900 bg-emerald-950 text-emerald-300'
                : 'border-red-900 bg-red-950 text-red-300'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <Button
            variant="primary"
            size="sm"
            disabled={busy || (!webhookSecret && !Object.values(priceIds).some(Boolean))}
            onClick={() => run('save_settings')}
            className="font-bold bg-[#0e6de4] text-white hover:bg-[#0c5bc2]"
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save Checkout Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}

