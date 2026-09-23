'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Loader2,
  Check,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AIProvidersSettingsPage() {
  const [activeProvider, setActiveProvider] = useState('none');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [openaiStatusText, setOpenaiStatusText] = useState('Not Configured');
  const [openaiMasked, setOpenaiMasked] = useState('NOT_CONFIGURED');
  
  const [anthropicConfigured, setAnthropicConfigured] = useState(false);
  const [anthropicStatusText, setAnthropicStatusText] = useState('Not Configured');
  const [anthropicMasked, setAnthropicMasked] = useState('NOT_CONFIGURED');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/integrations/ai');
        if (res.ok) {
          const data = await res.json();
          if (data.currentProvider) setActiveProvider(data.currentProvider);
          if (data.openai) {
            setOpenaiConfigured(Boolean(data.openai.configured));
            setOpenaiStatusText(data.openai.statusText || 'Not Configured');
            setOpenaiMasked(data.openai.maskedApiKey || 'NOT_CONFIGURED');
          }
          if (data.anthropic) {
            setAnthropicConfigured(Boolean(data.anthropic.configured));
            setAnthropicStatusText(data.anthropic.statusText || 'Not Configured');
            setAnthropicMasked(data.anthropic.maskedApiKey || 'NOT_CONFIGURED');
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI provider config:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/admin/integrations/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          openaiKey: openaiKey || undefined,
          anthropicKey: anthropicKey || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save AI provider settings.');
      }

      if (data.currentProvider) setActiveProvider(data.currentProvider);
      if (data.openai) {
        setOpenaiConfigured(Boolean(data.openai.configured));
        setOpenaiStatusText(data.openai.statusText || 'Not Configured');
        setOpenaiMasked(data.openai.maskedApiKey || 'NOT_CONFIGURED');
      }
      if (data.anthropic) {
        setAnthropicConfigured(Boolean(data.anthropic.configured));
        setAnthropicStatusText(data.anthropic.statusText || 'Not Configured');
        setAnthropicMasked(data.anthropic.maskedApiKey || 'NOT_CONFIGURED');
      }

      setOpenaiKey('');
      setAnthropicKey('');
      setSaveSuccess(data.message || 'AI Provider settings saved and encrypted successfully.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAI = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/integrations/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_ai', provider: activeProvider }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Test generation failed.');
      }

      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        error: err.message || 'Failed to run test generation.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans">
      {/* Back Link & Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/admin/integrations"
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Bot className="h-5 w-5" />
            </div>
            <span>AI Providers & Personalization Studio</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure LLM providers with enforced non-deceptive anti-hallucination guardrails and deterministic offline fallback.
          </p>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <Card className="p-6 space-y-6 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Active AI Engine</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select which engine powers automatic lead message customization.</p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-200 shrink-0">
            ENGINE: {activeProvider.toUpperCase()}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { id: 'none', title: 'None (Deterministic)', desc: 'Spintax & standard templates without AI API calls.' },
              { id: 'openai', title: 'OpenAI', desc: 'GPT-4o Mini & GPT-4o high-speed generation.' },
              { id: 'anthropic', title: 'Anthropic Claude', desc: 'Claude 3.5 Sonnet nuanced synthesis.' },
            ].map((p) => (
              <label
                key={p.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeProvider === p.id
                    ? 'border-[#0e6de4] bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="aiProvider"
                  value={p.id}
                  checked={activeProvider === p.id}
                  onChange={(e) => setActiveProvider(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <p className={`font-bold text-xs ${activeProvider === p.id ? 'text-[#0e6de4]' : 'text-slate-900'}`}>
                    {p.title}
                  </p>
                  {activeProvider === p.id && <CheckCircle2 className="h-4 w-4 text-[#0e6de4]" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
              </label>
            ))}
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-[#0e6de4]" />
                OpenAI API Key
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500">Key: {openaiMasked}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    openaiConfigured
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {openaiStatusText}
                </span>
              </div>
            </div>
            <input
              type="password"
              placeholder="sk-proj-••••••••••••••••••••••••"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono"
            />
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-[#0e6de4]" />
                Anthropic Claude API Key
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500">Key: {anthropicMasked}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    anthropicConfigured
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {anthropicStatusText}
                </span>
              </div>
            </div>
            <input
              type="password"
              placeholder="sk-ant-••••••••••••••••••••••••"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono"
            />
          </div>

          {/* Truthfulness Safety Banner */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-slate-800 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#0e6de4] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-slate-700">
              <strong className="text-slate-900">Enforced Anti-Hallucination Policy:</strong> The AI provider system prompt strictly forbids inventing company interactions, fabricating quotes, or claiming prior business relationships.
            </p>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSaving}
              className="font-bold bg-[#0e6de4] hover:bg-[#0c5bc2] text-white disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save AI Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* AI Test Connection Card */}
      <Card className="p-6 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Live AI Message Test Run</h3>
            <p className="text-xs text-slate-500 mt-0.5">Test message generation on a sample company lead.</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestAI}
            disabled={isTesting}
            className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4] animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4]" />
                Run Test Generation
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <div className="space-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
            {testResult.error ? (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{testResult.error}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between font-mono text-[11px] text-slate-600 font-bold border-b border-slate-200 pb-2">
                  <span className="text-[#0e6de4]">Provider: {testResult.provider} ({testResult.model})</span>
                  <span>Tokens Used: {testResult.tokensUsed}</span>
                </div>
                {testResult.subject && (
                  <p className="font-bold text-slate-900 text-xs">
                    Subject: <span className="font-normal text-slate-700">{testResult.subject}</span>
                  </p>
                )}
                <div className="font-sans text-slate-800 text-xs bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {testResult.generatedMessage}
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
