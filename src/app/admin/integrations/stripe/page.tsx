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
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900">
            <CreditCard className="h-6 w-6 text-violet-600" />
            Stripe Integration
          </h1>
          <p className="text-xs text-slate-500">Configure billing Checkout and webhook signatures.</p>
        </div>
      </div>

      <Card className="space-y-5 border-slate-200 bg-white p-6 shadow-xs">
        {/* Connection & Credential Source Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Connection Status</span>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Active
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Credential Source</span>
            <div className="mt-1">
              {isOverrideActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Lock className="h-3.5 w-3.5 text-amber-700" />
                  Custom Encrypted Vault Override
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-[#0e6de4] border border-blue-200">
                  <Server className="h-3.5 w-3.5 text-[#0e6de4]" />
                  ✓ Managed via Server Environment
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Override / Status Banner */}
        {isOverrideActive ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <TriangleAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>An encrypted runtime override is currently active.</span>
            </div>
            <p className="text-amber-800 leading-relaxed pl-6">
              This overrides the server environment key with a custom database-vault key (Preview: <code className="font-mono bg-amber-100 px-1 rounded font-bold">{masked}</code>).
            </p>
            <div className="pl-6 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => run('clear_override')}
                className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
                Clear Custom Override (Revert to Server Environment)
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 text-slate-700 text-xs flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#0e6de4] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900">Stripe is currently using the secure server environment configuration.</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                An API key does not need to be entered here unless you intentionally want to create a runtime encrypted override. (Preview: <code className="font-mono font-bold text-slate-800">{masked}</code>)
              </p>
            </div>
          </div>
        )}

        {/* Key Form */}
        <div className="space-y-3 pt-2">
          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            <span>Custom Encrypted API Key (Optional Override)</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_••••••••••••••••••••••••"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
            />
          </label>
          <p className="text-[11px] text-slate-500 font-mono">
            Leave blank to keep server environment configuration active.
          </p>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run('test')} className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50">
              <TestTube2 className="mr-1.5 h-4 w-4 text-[#0e6de4]" />
              Test Connection
            </Button>
            <Button variant="primary" size="sm" disabled={busy || !apiKey} onClick={() => run('save')} className="font-bold bg-[#0e6de4] text-white hover:bg-[#0c5bc2]">
              <Save className="mr-1.5 h-4 w-4" />
              Save Key Override
            </Button>
          </div>
        </div>

        {/* Checkout & Webhooks */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div>
            <p className="text-sm font-extrabold text-slate-900">Stripe Checkout & Webhook Settings</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Webhook signing secret status: <span className="font-bold text-slate-800">{webhookConfigured ? '✓ Configured' : 'Not Configured'}</span> (Endpoint: <code className="font-mono text-slate-800">/api/billing/webhook</code>)
            </p>
          </div>

          <label className="block space-y-1.5 text-xs font-bold text-slate-700">
            <span>Webhook Signing Secret</span>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_••••••••••••••••••••••••"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {[5000, 10000, 100000, 300000].map((credits) => (
              <label key={credits} className="block space-y-1.5 text-xs font-bold text-slate-700">
                <span>{credits.toLocaleString()} Credits Price ID</span>
                <input
                  type="password"
                  value={priceIds[credits]}
                  onChange={(e) => setPriceIds((current) => ({ ...current, [credits]: e.target.value }))}
                  placeholder="price_••••••••••••••••"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        {status && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
              status.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
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

