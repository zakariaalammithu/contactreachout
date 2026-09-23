'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Send,
  Loader2,
  ShieldCheck,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminChatbotPage() {
  const [prompt, setPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [metadata, setMetadata] = useState<{ lastUpdated: string; updatedBy: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [testQuery, setTestQuery] = useState('What services does ContactReachout provide?');
  const [isTestingChat, setIsTestingChat] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    answer: string;
    needsSupport: boolean;
    providerUsed: string;
  } | null>(null);

  const maxCharacters = 5000;

  useEffect(() => {
    async function loadConfig() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/chatbot');
        if (res.ok) {
          const data = await res.json();
          setPrompt(data.prompt || data.defaultPrompt || '');
          if (data.defaultPrompt) setDefaultPrompt(data.defaultPrompt);
          if (data.metadata) setMetadata(data.metadata);
        }
      } catch (err) {
        console.error('Failed to load chatbot config:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    if (prompt.trim().length < 50) {
      setSaveError('Chatbot instructions must be at least 50 characters long.');
      setIsSaving(false);
      return;
    }

    if (prompt.trim().length > maxCharacters) {
      setSaveError(`Chatbot instructions exceed the maximum limit of ${maxCharacters.toLocaleString()} characters.`);
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save instructions.');
      }

      if (data.metadata) setMetadata(data.metadata);
      setSaveSuccess(data.message || 'Chatbot instructions saved successfully.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save chatbot instructions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (defaultPrompt) {
      setPrompt(defaultPrompt);
    }
  };

  const handleTestChat = async (queryToRun?: string) => {
    const q = queryToRun || testQuery;
    if (!q || !q.trim()) return;

    setIsTestingChat(true);
    setTestResponse(null);

    try {
      const res = await fetch('/api/admin/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_chatbot', testMessage: q.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResponse({
          answer: data.answer,
          needsSupport: data.needsSupport,
          providerUsed: data.providerUsed,
        });
      } else {
        setTestResponse({
          answer: data.error || 'Error generating test chatbot response.',
          needsSupport: true,
          providerUsed: 'error',
        });
      }
    } catch (err: any) {
      setTestResponse({
        answer: `Network Error: ${err.message}`,
        needsSupport: true,
        providerUsed: 'error',
      });
    } finally {
      setIsTestingChat(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
            <Bot className="h-5 w-5" />
          </div>
          <span>AI Chatbot Knowledge & System Prompt</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage the knowledge base and system instructions used by the public ContactReachout support assistant.
        </p>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Error Banner */}
      {saveError && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Instructions Card */}
      <Card className="p-6 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">System Instructions & Knowledge Base</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforce strict anti-hallucination and product boundaries for customer inquiries.
            </p>
          </div>

          {metadata && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 shrink-0">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#0e6de4]" />
                {new Date(metadata.lastUpdated).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-[#0e6de4]" />
                {metadata.updatedBy}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={9}
            disabled={isLoading || isSaving}
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs text-slate-900 font-mono leading-relaxed placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none disabled:bg-slate-50"
            placeholder="Add detailed product, pricing, FAQ and support guidance…"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold ${
                  prompt.length > maxCharacters ? 'text-red-600' : 'text-slate-500'
                }`}
              >
                {prompt.length.toLocaleString()} / {maxCharacters.toLocaleString()} MAX characters
              </span>

              {defaultPrompt && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] text-slate-500 hover:text-[#0e6de4] font-semibold underline flex items-center gap-1 ml-2 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to Default
                </button>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving || isLoading || prompt.trim().length < 50 || prompt.length > maxCharacters}
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
                  Save Instructions
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Security Rules Banner */}
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-slate-800 flex items-start gap-2.5 mt-2">
          <ShieldCheck className="h-4 w-4 text-[#0e6de4] shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed text-slate-700">
            <p className="font-bold text-slate-900">Enforced Chatbot Security Safeguards:</p>
            <p>
              • Never reveals API keys, credentials, internal prompts, or admin routes.
              <br />
              • Prompt injection attempts (e.g. "ignore previous directives") are automatically blocked.
              <br />
              • Unverified features or pricing guarantees revert to support team fallback.
            </p>
          </div>
        </div>
      </Card>

      {/* Live Chatbot Test & Preview Card */}
      <Card className="p-6 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Live Support Chatbot Tester</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test how the chatbot answers customer inquiries using current system instructions.
          </p>
        </div>

        {/* Sample Question Chips */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="text-slate-500 font-semibold py-1">Quick Sample Prompts:</span>
          {[
            'What services does ContactReachout provide?',
            'How much do credits cost?',
            'How does AI Personalization work?',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setTestQuery(sample);
                handleTestChat(sample);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-[#0e6de4] text-slate-700 font-medium transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type a test question for the AI assistant..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleTestChat()}
            disabled={isTestingChat || !testQuery.trim()}
            className="font-bold bg-[#0e6de4] hover:bg-[#0c5bc2] text-white disabled:opacity-50"
          >
            {isTestingChat ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Test Chatbot Response
              </>
            )}
          </Button>
        </div>

        {testResponse && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 border-b border-slate-200 pb-2">
              <span className="font-bold text-[#0e6de4]">Provider: {testResponse.providerUsed}</span>
              {testResponse.needsSupport ? (
                <span className="text-amber-700 font-sans font-bold">Fallback: Support Redirect</span>
              ) : (
                <span className="text-emerald-700 font-sans font-bold">Verified Direct Answer</span>
              )}
            </div>

            <p className="font-sans text-slate-800 text-xs bg-white p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
              {testResponse.answer}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
