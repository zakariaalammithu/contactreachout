'use client';

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
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ResendEmailSettingsPage() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('NOT_CONFIGURED');
  const [fromEmail, setFromEmail] = useState('outreach@bulkreach.io');
  const [fromName, setFromName] = useState('BulkReach Outreach Team');
  const [replyToEmail, setReplyToEmail] = useState('support@bulkreach.io');
  const [testRecipient, setTestRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/integrations/email')
      .then((res) => res.json())
      .then((data) => {
        if (data.maskedApiKey) setMaskedApiKey(data.maskedApiKey);
        if (data.fromEmail) setFromEmail(data.fromEmail);
        if (data.fromName) setFromName(data.fromName);
        if (data.replyToEmail) setReplyToEmail(data.replyToEmail);
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
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
      if (data.success) {
        if (data.maskedApiKey) setMaskedApiKey(data.maskedApiKey);
        setApiKeyInput('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to save configuration.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestStatusMessage(null);
    try {
      const res = await fetch('/api/admin/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' }),
      });
      const data = await res.json();
      setTestStatusMessage(data.message || (data.connected ? 'Connected successfully!' : 'Connection failed.'));
    } catch (err: any) {
      setTestStatusMessage(`Error testing connection: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      alert('Please enter a test recipient email.');
      return;
    }
    setIsSendingTest(true);
    setTestStatusMessage(null);
    try {
      const res = await fetch('/api/admin/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test_email',
          testEmailRecipient: testRecipient,
          fromEmail,
          fromName,
          replyToEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatusMessage(`Test email dispatched successfully! ID: ${data.messageId}`);
      } else {
        setTestStatusMessage(`Test email failed: ${data.errorMessage}`);
      }
    } catch (err: any) {
      setTestStatusMessage(`Error sending email: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link & Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/integrations" className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-purple-400" />
            Resend Email Integration Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure server-side credentials for automated outreach notifications, deliverability reports, and team alerts.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          Resend email configuration successfully saved and encrypted.
        </div>
      )}

      {/* Main Settings Form */}
      <Card className="glass-panel p-6 space-y-6 border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="font-bold text-white text-sm">Resend API Key & Senders</h3>
            <p className="text-xs text-slate-400 mt-0.5">Credentials are encrypted with AES-256-GCM and never exposed to the browser.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Current Key:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-purple-300 font-bold">
              {maskedApiKey}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-purple-400" />
              Update Resend API Key
            </label>
            <input
              type="password"
              placeholder="re_••••••••••••••••••••••••"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500">Leave blank to keep existing encrypted API key unchanged.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Default From Email</label>
              <input
                type="email"
                required
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Default Sender Name</label>
              <input
                type="text"
                required
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Reply-To Email (Optional)</label>
            <input
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Resend Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* Diagnostics & Test Email Dispatcher */}
      <Card className="glass-panel p-6 space-y-4 border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="font-bold text-white text-sm">Resend Live Diagnostics & Test Dispatch</h3>
            <p className="text-xs text-slate-400 mt-0.5">Test API connectivity and send an immediate verification email.</p>
          </div>

          <Button variant="outline" size="sm" onClick={handleTestConnection} isLoading={isTestingConnection}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
            Test API Connection
          </Button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300">Send Test Verification Email</label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="mithusquare@gmail.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <Button variant="primary" size="sm" onClick={handleSendTestEmail} isLoading={isSendingTest}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send Test Email
            </Button>
          </div>

          {testStatusMessage && (
            <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs font-mono text-indigo-300">
              {testStatusMessage}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
