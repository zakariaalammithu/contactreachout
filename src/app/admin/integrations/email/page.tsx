'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  ShieldCheck,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Check,
  Info,
  Trash2,
  Server,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { recordIntegrationTest } from '@/lib/integration-test-record';

export default function ResendEmailSettingsPage() {
  const [maskedApiKey, setMaskedApiKey] = useState('NOT_CONFIGURED');
  const [credentialSource, setCredentialSource] = useState<'env' | 'global' | 'user' | 'none'>('env');
  const [sourceText, setSourceText] = useState('Managed via Server Environment');
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [fromEmail, setFromEmail] = useState('auth@contactreachout.com');
  const [fromName, setFromName] = useState('ContactReachout');
  const [replyToEmail, setReplyToEmail] = useState('hello@contactreachout.com');
  const [testRecipient, setTestRecipient] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);
  const [testIsSuccess, setTestIsSuccess] = useState<boolean | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/integrations/email');
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(Boolean(data.enabled));
        if (data.maskedApiKey) setMaskedApiKey(data.maskedApiKey);
        if (data.source) setCredentialSource(data.source);
        if (data.sourceText) setSourceText(data.sourceText);
        setIsOverrideActive(Boolean(data.isOverrideActive));
        if (data.fromEmail) setFromEmail(data.fromEmail);
        if (data.fromName) setFromName(data.fromName);
        if (data.replyToEmail) setReplyToEmail(data.replyToEmail);
      }
    } catch (err) {
      console.error('Failed to fetch Resend config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestStatusMessage(null);
    setTestIsSuccess(null);

    try {
      const res = await fetch('/api/admin/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' }),
      });

      const data = await res.json();
      const ok = res.ok && data.connected === true && data.success === true;
      setTestIsSuccess(ok);
      recordIntegrationTest('resend', ok);
      setTestStatusMessage(
        data.message || (data.connected ? 'Resend API connection test successful!' : 'Connection test failed.')
      );
    } catch (err: any) {
      setTestIsSuccess(false);
      recordIntegrationTest('resend', false);
      setTestStatusMessage(`Connection error: ${err.message || 'Unable to connect to Resend.'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.trim()) {
      setTestIsSuccess(false);
      setTestStatusMessage('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingTest(true);
    setTestStatusMessage(null);
    setTestIsSuccess(null);

    try {
      const res = await fetch('/api/admin/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test_email',
          testEmailRecipient: testRecipient.trim(),
          fromEmail,
          fromName,
          replyToEmail,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestIsSuccess(true);
        setTestStatusMessage(`Test verification email sent successfully! Message ID: ${data.messageId}`);
      } else {
        setTestIsSuccess(false);
        setTestStatusMessage(`Dispatch failed: ${data.errorMessage || data.error || 'Check Resend credentials.'}`);
      }
    } catch (err: any) {
      setTestIsSuccess(false);
      setTestStatusMessage(`Failed to send test email: ${err.message}`);
    } finally {
      setIsSendingTest(false);
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
              <Mail className="h-5 w-5" />
            </div>
            <span>Resend Email Integration</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Server-side email dispatch configuration for outreach verification, system notifications, and campaign execution.
          </p>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-900 bg-emerald-950 text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="p-3.5 rounded-xl border border-red-900 bg-red-950 text-xs font-bold text-red-300 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Credential Architecture Status Card */}
      <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Connection Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                testIsSuccess === true
                  ? 'bg-emerald-900 text-emerald-300 border-emerald-900'
                  : testIsSuccess === false
                    ? 'bg-red-950 text-red-300 border-red-900'
                    : isConfigured
                      ? 'bg-amber-950 text-amber-200 border-amber-900'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800'
              }`}>
                {testIsSuccess === true ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {testIsSuccess === true
                  ? 'Connected'
                  : testIsSuccess === false
                    ? 'Connection Failed'
                    : isConfigured
                      ? 'Configured — Not Verified'
                      : 'Not Configured'}
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

        {/* Status Description Banner */}
        {isOverrideActive ? (
          <div className="p-4 rounded-xl border border-amber-900 bg-amber-950/80 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>An encrypted runtime override is currently active.</span>
            </div>
            <p className="text-amber-300 leading-relaxed pl-6">
              This overrides the Vercel server environment key with a custom database-vault encrypted key (Preview: <code className="font-mono bg-amber-900 px-1.5 py-0.5 rounded text-amber-950 font-bold">{maskedApiKey}</code>).
            </p>
            <p className="text-amber-300 leading-relaxed pl-6">
              Dashboard key editing is disabled under environment-only mode. This temporary override lapses when the instance recycles — the lasting value must be set in server environment.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-blue-900 bg-blue-950/60 text-zinc-300 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Resend is currently using the secure server environment configuration.</span>
            </div>
            <p className="text-zinc-400 leading-relaxed pl-6">
              API keys and sender identity come from server environment only. Dashboard key editing is disabled under environment-only mode.
            </p>
            <div className="pl-6 flex items-center gap-2 pt-1 text-[11px] font-mono text-zinc-400">
              <span>Active Environment Credential:</span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold">
                {isLoading ? 'Loading...' : maskedApiKey}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Main Settings Form Card */}
      <Card className="p-6 space-y-6 border-zinc-800 bg-zinc-950 shadow-xs">
        <div>
          <h3 className="font-extrabold text-zinc-100 text-sm">Sender Configuration (read-only)</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sender identity from server environment. Dashboard editing is disabled.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Default From Email</label>
              <p className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 font-mono">{fromEmail}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Default Sender Name</label>
              <p className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100">{fromName}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Reply-To Email</label>
            <p className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 font-mono">{replyToEmail}</p>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Sender identity is read from server environment only (RESEND_FROM_EMAIL / RESEND_FROM_NAME / RESEND_REPLY_TO). Dashboard editing is disabled under environment-only mode — update Vercel Environment Variables and redeploy to change these values.
          </p>
        </div>
      </Card>

      {/* Diagnostics & Test Email Dispatcher Card */}
      <Card className="p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-extrabold text-zinc-100 text-sm">Resend Diagnostics & Live Test Dispatch</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tests connectivity using the active credential ({isOverrideActive ? 'Encrypted Vault Override' : 'Server Environment'}).
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-900"
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 text-blue-400 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                Test API Connection
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-zinc-300">Send Test Verification Email</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="recipient@example.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendTestEmail}
              disabled={isSendingTest}
              className="font-bold bg-[#0e6de4] hover:bg-[#0c5bc2] text-white disabled:opacity-50"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>

          {testStatusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testIsSuccess === true
                  ? 'border-emerald-900 bg-emerald-950 text-emerald-300'
                  : testIsSuccess === false
                  ? 'border-red-900 bg-red-950 text-red-300'
                  : 'border-blue-900 bg-blue-950 text-blue-300'
              }`}
            >
              {testIsSuccess === true ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : testIsSuccess === false ? (
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed break-all">{testStatusMessage}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

