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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ResendEmailSettingsPage() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('NOT_CONFIGURED');
  const [fromEmail, setFromEmail] = useState('auth@contactreachout.com');
  const [fromName, setFromName] = useState('ContactReachout');
  const [replyToEmail, setReplyToEmail] = useState('hello@contactreachout.com');
  const [testRecipient, setTestRecipient] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);
  const [testIsSuccess, setTestIsSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/integrations/email');
        if (res.ok) {
          const data = await res.json();
          if (data.maskedApiKey) setMaskedApiKey(data.maskedApiKey);
          if (data.fromEmail) setFromEmail(data.fromEmail);
          if (data.fromName) setFromName(data.fromName);
          if (data.replyToEmail) setReplyToEmail(data.replyToEmail);
        }
      } catch (err) {
        console.error('Failed to fetch Resend config:', err);
      } finally {
        setIsLoading(false);
      }
    }
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
      if (data.fromEmail) setFromEmail(data.fromEmail);
      if (data.fromName) setFromName(data.fromName);
      if (data.replyToEmail) setReplyToEmail(data.replyToEmail);

      setApiKeyInput('');
      setSaveSuccess(data.message || 'Resend email configuration saved and encrypted successfully.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
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
            <span>Resend Email Integration Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure server-side credentials for automated outreach notifications, deliverability reports, and team alerts.
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

      {/* Main Settings Form Card */}
      <Card className="p-6 space-y-6 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Resend API Key & Senders</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Credentials are encrypted using AES-256-GCM server-side and never exposed to client browsers.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-500 font-medium">Current Key:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800 font-bold">
              {isLoading ? 'Loading...' : maskedApiKey}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-[#0e6de4]" />
              Update Resend API Key
            </label>
            <input
              type="password"
              placeholder="re_••••••••••••••••••••••••"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500 font-mono">
              Leave blank to keep existing encrypted API key unchanged.
            </p>
          </div>

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
            <label className="text-xs font-bold text-slate-700">Reply-To Email (Optional)</label>
            <input
              type="email"
              placeholder="hello@contactreachout.com"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
            />
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
                  Save Resend Settings
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
            <h3 className="font-extrabold text-slate-900 text-sm">Resend Live Diagnostics & Test Dispatch</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Test API connectivity and send an immediate verification email to verify deliverability.
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
              placeholder="mithusquare@gmail.com"
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
