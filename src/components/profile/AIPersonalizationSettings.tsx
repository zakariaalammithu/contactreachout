'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AIPersonalizationSettings() {
  const [loading, setLoading] = useState(true);
  const [isPaidPlan, setIsPaidPlan] = useState(false);
  const [canUseAi, setCanUseAi] = useState(false);
  const [userPlan, setUserPlan] = useState('Free');
  const [providerChoice, setProviderChoice] = useState<'contactreachout' | 'user_openai'>('contactreachout');
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState('NOT_CONFIGURED');

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/ai-settings');
      if (res.ok) {
        const data = await res.json();
        setIsPaidPlan(data.isPaidPlan);
        setCanUseAi(data.canUseAi);
        setUserPlan(data.userPlan || 'Free');
        setProviderChoice(data.providerChoice || 'contactreachout');
        setOpenaiConfigured(data.openaiConfigured);
        setMaskedApiKey(data.maskedApiKey || 'NOT_CONFIGURED');
      }
    } catch (e) {
      console.error('Failed to load user AI settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setMessage(null);
      const res = await fetch('/api/user/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          openaiApiKey: openaiKeyInput || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message || 'OpenAI connection successful.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Unable to connect. Please verify your API key.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Network error while testing connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/user/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_settings',
          providerChoice,
          openaiApiKey: openaiKeyInput || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'AI Settings saved successfully.' });
        setOpenaiConfigured(data.openaiConfigured);
        setMaskedApiKey(data.maskedApiKey || 'NOT_CONFIGURED');
        setOpenaiKeyInput('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-3xl border border-blue-100 bg-white p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#0e6de4]" />
      </div>
    );
  }

  // FREE USER UI — STRICT LOCKOUT WITH UPGRADE ACTION
  if (!isPaidPlan) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">AI Personalization</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  Locked (Free Plan)
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                AI Personalization requires a paid ContactReachout plan.
              </p>
            </div>
          </div>

          <Link href="/pricing">
            <Button type="button" className="bg-[#0e6de4] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 cursor-pointer">
              <span>View Plans</span>
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
          <p className="text-xs font-bold text-slate-800">
            Why is AI Personalization locked?
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            ContactReachout AI Personalization is exclusive to paid plans. Adding your own OpenAI API key does not enable AI Personalization on the Free plan. Upgrade to any paid plan (Starter, Growth, Agency, Enterprise) to unlock AI-powered outreach and optional custom API key support.
          </p>
        </div>
      </div>
    );
  }

  // PAID USER UI — FULL PROVIDER SELECTION & SECURE OPENAI KEY CONFIGURATION
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">AI Personalization</h2>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active ({userPlan})
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Choose your preferred AI provider for generating personalized website contact-form messages.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-semibold ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            Select AI Provider
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Option 1: ContactReachout AI */}
            <label
              className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all ${
                providerChoice === 'contactreachout'
                  ? 'border-[#0e6de4] bg-blue-50/50 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[#0e6de4]" />
                  <span className="text-sm font-bold text-slate-900">ContactReachout AI</span>
                </div>
                <input
                  type="radio"
                  name="providerChoice"
                  value="contactreachout"
                  checked={providerChoice === 'contactreachout'}
                  onChange={() => setProviderChoice('contactreachout')}
                  className="h-4 w-4 text-[#0e6de4] focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Use the high-performance AI provider fully managed and configured by ContactReachout.
              </p>
            </label>

            {/* Option 2: My OpenAI API Key */}
            <label
              className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all ${
                providerChoice === 'user_openai'
                  ? 'border-[#0e6de4] bg-blue-50/50 shadow-2xs'
                  : 'border-slate-200 bg-white hover:border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#0e6de4]" />
                  <span className="text-sm font-bold text-slate-900">Use My OpenAI API Key</span>
                </div>
                <input
                  type="radio"
                  name="providerChoice"
                  value="user_openai"
                  checked={providerChoice === 'user_openai'}
                  onChange={() => setProviderChoice('user_openai')}
                  className="h-4 w-4 text-[#0e6de4] focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Use your own OpenAI API key for AI Personalization.
              </p>
            </label>
          </div>
        </div>

        {/* OpenAI Key Configuration Fields (Available when My OpenAI API Key selected) */}
        {providerChoice === 'user_openai' && (
          <div className="rounded-2xl border border-blue-200 bg-slate-50/80 p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                OpenAI API Key
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                Status:{' '}
                {openaiConfigured ? (
                  <span className="text-emerald-700 font-bold">Configured ({maskedApiKey})</span>
                ) : (
                  <span className="text-amber-700 font-bold">Not Configured</span>
                )}
              </span>
            </div>

            <input
              type="password"
              value={openaiKeyInput}
              onChange={(e) => setOpenaiKeyInput(e.target.value)}
              placeholder={openaiConfigured ? `•••••••••••••••• (Leave blank to keep existing key)` : 'sk-...'}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-mono outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-slate-500 font-medium">
                Your API key is securely encrypted server-side and is only used for your account&apos;s AI requests.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-1.5 text-xs font-semibold cursor-pointer shrink-0 border-slate-300 text-slate-700 hover:text-slate-900"
              >
                {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Test Connection
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end border-t border-slate-100 pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#0e6de4] hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 cursor-pointer"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
