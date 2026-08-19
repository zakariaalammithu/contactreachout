'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  ShieldCheck,
  Save,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AIProvidersSettingsPage() {
  const [activeProvider, setActiveProvider] = useState('none');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiMasked, setOpenaiMasked] = useState('NOT_CONFIGURED');
  const [anthropicMasked, setAnthropicMasked] = useState('NOT_CONFIGURED');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [anthropicModel, setAnthropicModel] = useState('claude-3-5-sonnet-20241022');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/integrations/ai')
      .then((res) => res.json())
      .then((data) => {
        if (data.currentProvider) setActiveProvider(data.currentProvider);
        if (data.openai?.maskedApiKey) setOpenaiMasked(data.openai.maskedApiKey);
        if (data.anthropic?.maskedApiKey) setAnthropicMasked(data.anthropic.maskedApiKey);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/integrations/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          openaiKey: openaiKey || undefined,
          anthropicKey: anthropicKey || undefined,
          model: activeProvider === 'openai' ? openaiModel : anthropicModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOpenaiKey('');
        setAnthropicKey('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
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
        body: JSON.stringify({ action: 'test_ai' }),
      });
      const data = await res.json();
      setTestResult(data);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/integrations" className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="h-6 w-6 text-pink-400" />
            AI Providers & Personalization Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure LLM providers with enforced non-deceptive anti-hallucination guardrails and deterministic offline fallback.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          AI Provider configurations successfully saved and encrypted.
        </div>
      )}

      {/* Main Settings Card */}
      <Card className="glass-panel p-6 space-y-6 border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="font-bold text-white text-sm">Active AI Engine</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select which engine powers automatic lead message customization.</p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-pink-500/15 text-pink-400 border border-pink-500/30">
            ENGINE: {activeProvider.toUpperCase()}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Provider Selection */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { id: 'none', title: 'None (Deterministic)', desc: 'Spintax & standard templates without AI API.' },
              { id: 'openai', title: 'OpenAI', desc: 'GPT-4o Mini & GPT-4o high-speed generation.' },
              { id: 'anthropic', title: 'Anthropic Claude', desc: 'Claude 3.5 Sonnet nuanced synthesis.' },
            ].map((p) => (
              <label
                key={p.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  activeProvider === p.id
                    ? 'border-pink-500 bg-pink-950/20 shadow-md shadow-pink-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'
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
                  <p className="font-bold text-white text-xs">{p.title}</p>
                  {activeProvider === p.id && <CheckCircle2 className="h-4 w-4 text-pink-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{p.desc}</p>
              </label>
            ))}
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">OpenAI API Key</label>
              <span className="text-[10px] font-mono text-slate-500">Current: {openaiMasked}</span>
            </div>
            <input
              type="password"
              placeholder="sk-proj-••••••••••••••••••••••••"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Anthropic Claude API Key</label>
              <span className="text-[10px] font-mono text-slate-500">Current: {anthropicMasked}</span>
            </div>
            <input
              type="password"
              placeholder="sk-ant-••••••••••••••••••••••••"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>

          {/* Truthfulness Safety Banner */}
          <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Enforced Anti-Hallucination Policy:</strong> The AI provider system prompt strictly forbids inventing company interactions, fabricating quotes, or claiming prior business relationships.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              Save AI Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* AI Test Connection Card */}
      <Card className="glass-panel p-6 space-y-4 border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="font-bold text-white text-sm">Live AI Message Test Run</h3>
            <p className="text-xs text-slate-400 mt-0.5">Test message generation on a sample company lead.</p>
          </div>

          <Button variant="outline" size="sm" onClick={handleTestAI} isLoading={isTesting}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-pink-400" />
            Run Test Generation
          </Button>
        </div>

        {testResult && (
          <div className="space-y-2 p-3.5 rounded-xl border border-pink-500/30 bg-pink-950/20 text-xs text-pink-200">
            <div className="flex justify-between font-mono text-[11px] text-pink-400 font-bold">
              <span>Provider: {testResult.provider}</span>
              <span>Tokens Used: {testResult.tokensUsed}</span>
            </div>
            <p className="font-sans text-white text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              "{testResult.generatedMessage}"
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
