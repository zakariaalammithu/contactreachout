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

export default function ResendEmailSettingsPage() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('NOT_CONFIGURED');
  const [credentialSource, setCredentialSource] = useState<'env' | 'global' | 'user' | 'none'>('env');
  const [sourceText, setSourceText] = useState('Managed via Server Environment');
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [fromEmail, setFromEmail] = useState('auth@contactreachout.com');
  const [fromName, setFromName] = useState('ContactReachout');
  const [replyToEmail, setReplyToEmail] = useState('hello@contactreachout.com');
  const [testRecipient, setTestRecipient] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingOverride, setIsClearingOverride] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);
  const [testIsSuccess, setTestIsSuccess] = useState<boolean | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/integrations/email');
      if (res.ok) {
        const data = await res.json();
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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/admin/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyInput || undefined,
          fromEmail,
          fromName,
          replyToEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Resend configuration.');
      }

      if (data.maskedApiKey) setMaskedApiKey(data.maskedApiKey);
      if (data.source) setCredentialSource(data.source);
      if (data.sourceText) setSourceText(data.sourceText);
      setIsOverrideActive(Boolean(data.isOverrideActive));
      if (data.fromEmail) setFromEmail(data.fromEmail);
      if (data.fromName) setFromName(data.fromName);
      if (data.replyToEmail) setReplyToEmail(data.replyToEmail);

      setApiKeyInput('');
      setSaveSuccess(data.message || 'Resend email configuration saved successfully.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearOverride = async () => {
    if (!confirm('Are you sure you want to remove the custom encrypted vault override and revert to the Vercel server environment key?')) {
      return;
    }

    setIsClearingOverride(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/admin/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_override' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to clear custom override.');
      }

      if (data.maskedApiKey) setMaskedApiKey(data.maskedApiKey);
      if (data.source) setCredentialSource(data.source);
      if (data.sourceText) setSourceText(data.sourceText);
      setIsOverrideActive(Boolean(data.isOverrideActive));

      setSaveSuccess('Custom encrypted vault override cleared. System reverted to Server Environment key.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to clear override.');
    } finally {
      setIsClearingOverride(false);
    }
  };

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
      setTestIsSuccess(data.connected || data.success || false);
      setTestStatusMessage(
        data.message || (data.connected ? 'Resend API connection test successful!' : 'Connection test failed.')
      );
    } catch (err: any) {
      setTestIsSuccess(false);
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
              <Mail className="h-5 w-5" />
            </div>
            <span>Resend Email Integration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Server-side email dispatch configuration for outreach verification, system notifications, and campaign execution.
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

      {/* Credential Architecture Status Card */}
      <Card className="p-6 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Connection Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Connected
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

        {/* Status Description Banner */}
        {isOverrideActive ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>An encrypted runtime override is currently active.</span>
            </div>
            <p className="text-amber-800 leading-relaxed pl-6">
              This overrides the Vercel server environment key with a custom database-vault encrypted key (Preview: <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-950 font-bold">{maskedApiKey}</code>).
            </p>
            <div className="pl-6 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearOverride}
                disabled={isClearingOverride}
                className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
              >
                {isClearingOverride ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Clearing Override...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
                    Clear Custom Vault Override (Revert to Server Environment)
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 text-slate-700 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-[#0e6de4]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Resend is currently using the secure server environment configuration.</span>
            </div>
            <p className="text-slate-600 leading-relaxed pl-6">
              An API key does not need to be entered here unless you intentionally want to create a runtime encrypted override.
            </p>
            <div className="pl-6 flex items-center gap-2 pt-1 text-[11px] font-mono text-slate-500">
              <span>Active Environment Credential:</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-bold">
                {isLoading ? 'Loading...' : maskedApiKey}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Main Settings Form Card */}
      <Card className="p-6 space-y-6 border-slate-200 bg-white shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">Sender Configuration & Optional Override</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Default Sender identity or optionally store an encrypted key override.
          </p>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Default From Email</label>
              <input
                type="email"
                required
                placeholder="auth@contactreachout.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Default Sender Name</label>
              <input
                type="text"
                required
                placeholder="ContactReachout"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reply-To Email</label>
            <input
              type="email"
              placeholder="hello@contactreachout.com"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
            />
          </div>

          {/* Optional Runtime Override Section */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-[#0e6de4]" />
              Custom Encrypted Vault API Key (Optional Override)
            </label>
            <input
              type="password"
              placeholder="re_••••••••••••••••••••••••"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500 font-mono">
              Leave blank to keep server environment configuration active.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  Save Sender Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Diagnostics & Test Email Dispatcher Card */}
      <Card className="p-6 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Resend Diagnostics & Live Test Dispatch</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tests connectivity using the active credential ({isOverrideActive ? 'Encrypted Vault Override' : 'Server Environment'}).
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4] animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4]" />
                Test API Connection
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700">Send Test Verification Email</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              placeholder="recipient@example.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
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
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : testIsSuccess === false
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              {testIsSuccess === true ? (
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : testIsSuccess === false ? (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="h-4 w-4 text-[#0e6de4] shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed break-all">{testStatusMessage}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

