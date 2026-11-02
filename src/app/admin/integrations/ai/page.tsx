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
  Server,
  Lock,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AIProvidersSettingsPage() {
  const [activeProvider, setActiveProvider] = useState('none');

  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [openaiStatusText, setOpenaiStatusText] = useState('Not Configured');
  const [openaiSource, setOpenaiSource] = useState<'env' | 'global' | 'user' | 'none'>('none');
  const [openaiIsOverride, setOpenaiIsOverride] = useState(false);
  const [openaiMasked, setOpenaiMasked] = useState('NOT_CONFIGURED');

  const [anthropicConfigured, setAnthropicConfigured] = useState(false);
  const [anthropicStatusText, setAnthropicStatusText] = useState('Not Configured');
  const [anthropicSource, setAnthropicSource] = useState<'env' | 'global' | 'user' | 'none'>('none');
  const [anthropicIsOverride, setAnthropicIsOverride] = useState(false);
  const [anthropicMasked, setAnthropicMasked] = useState('NOT_CONFIGURED');

  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const [testResult, setTestResult] = useState<any | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/integrations/ai');
      if (res.ok) {
        const data = await res.json();
        if (data.currentProvider) setActiveProvider(data.currentProvider);
        if (data.openai) {
          setOpenaiConfigured(Boolean(data.openai.configured));
          setOpenaiStatusText(data.openai.statusText || 'Not Configured');
          setOpenaiSource(data.openai.source || 'none');
          setOpenaiIsOverride(Boolean(data.openai.isOverrideActive));
          setOpenaiMasked(data.openai.maskedApiKey || 'NOT_CONFIGURED');
        }
        if (data.anthropic) {
          setAnthropicConfigured(Boolean(data.anthropic.configured));
          setAnthropicStatusText(data.anthropic.statusText || 'Not Configured');
          setAnthropicSource(data.anthropic.source || 'none');
          setAnthropicIsOverride(Boolean(data.anthropic.isOverrideActive));
          setAnthropicMasked(data.anthropic.maskedApiKey || 'NOT_CONFIGURED');
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI provider config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

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
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <Link
          href="/admin/integrations"
          className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <Bot className="h-5 w-5" />
            </div>
            <span>AI Personalization Engine Settings</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Global LLM key management & server environment architecture status.
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <Card className="p-6 space-y-6 border-zinc-800 bg-zinc-950 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-extrabold text-zinc-100 text-sm">Active System AI Provider</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Select the global AI provider for system-wide personalization.</p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-950 text-blue-400 border border-blue-900 shrink-0">
            ACTIVE ENGINE: {activeProvider.toUpperCase()}
          </span>
        </div>

        <div className="space-y-5">
          {/* Provider (read-only, from server environment) */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-300 leading-relaxed">
            <p className="font-bold text-zinc-100">Active provider is read from server environment (AI_PROVIDER).</p>
            <p className="text-[11px] text-zinc-400 mt-1">Dashboard key editing is disabled under environment-only mode: set AI_PROVIDER, OPENAI_API_KEY and ANTHROPIC_API_KEY in Vercel Environment Variables and redeploy to change the provider or keys.</p>
          </div>

          {/* OpenAI Configuration Box */}
          <div className="space-y-2.5 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-blue-400" />
                OpenAI Key Configuration
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400 font-medium">Preview: {openaiMasked}</span>
                {openaiIsOverride ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-900 text-amber-200 border border-amber-800">
                    <Lock className="h-3 w-3 text-amber-300" />
                    Custom Encrypted Vault Override
                  </span>
                ) : openaiSource === 'env' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-blue-400 border border-blue-900">
                    <Server className="h-3 w-3 text-blue-400" />
                    ✓ Managed via Server Environment
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-800">
                    Not Configured
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">Key entry is disabled — this key comes from server environment only.</p>
          </div>

          {/* Anthropic Configuration Box */}
          <div className="space-y-2.5 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-blue-400" />
                Anthropic Claude Key Configuration
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400 font-medium">Preview: {anthropicMasked}</span>
                {anthropicIsOverride ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-900 text-amber-200 border border-amber-800">
                    <Lock className="h-3 w-3 text-amber-300" />
                    Custom Encrypted Vault Override
                  </span>
                ) : anthropicSource === 'env' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-blue-400 border border-blue-900">
                    <Server className="h-3 w-3 text-blue-400" />
                    ✓ Managed via Server Environment
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-800">
                    Not Configured
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">Key entry is disabled — this key comes from server environment only.</p>
          </div>

          {/* Paid User BYOK Architecture Note */}
          <div className="p-3.5 rounded-xl border border-emerald-900 bg-emerald-950/70 text-xs text-zinc-200 flex items-start gap-2.5">
            <UserCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-950">Paid User BYOK (Bring Your Own Key) Policy:</span>
              <p className="text-[11px] leading-relaxed text-emerald-200">
                Free users access standard outreach tools without API keys. Paid subscribers may optionally enter their own user-level OpenAI API Key in Settings to power personal campaign personalization. User-level keys remain strictly isolated and never override global admin keys.
              </p>
            </div>
          </div>

        </div>
      </Card>

      {/* AI Test Connection Card */}
      <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-extrabold text-zinc-100 text-sm">Live AI Message Test Run</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Test message generation on a sample company lead.</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestAI}
            disabled={isTesting}
            className="font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-900"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 text-blue-400 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                Run Test Generation
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <div className="space-y-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900 text-xs">
            {testResult.error ? (
              <div className="p-3 rounded-lg border border-red-900 bg-red-950 text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{testResult.error}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between font-mono text-[11px] text-zinc-400 font-bold border-b border-zinc-800 pb-2">
                  <span className="text-blue-400">Provider: {testResult.provider} ({testResult.model})</span>
                  <span>Tokens Used: {testResult.tokensUsed}</span>
                </div>
                {testResult.subject && (
                  <p className="font-bold text-zinc-100 text-xs">
                    Subject: <span className="font-normal text-zinc-300">{testResult.subject}</span>
                  </p>
                )}
                <div className="font-sans text-zinc-200 text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
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
