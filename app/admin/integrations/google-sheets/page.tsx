'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  ShieldCheck,
  Save,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function GoogleSheetsSettingsPage() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [maskedClientId, setMaskedClientId] = useState('NOT_CONFIGURED');
  const [redirectUri, setRedirectUri] = useState('http://localhost:3000/api/integrations/google-sheets/callback');
  const [isEnabled, setIsEnabled] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/integrations/google-sheets')
      .then((res) => res.json())
      .then((data) => {
        if (data.maskedClientId) setMaskedClientId(data.maskedClientId);
        if (data.redirectUri) setRedirectUri(data.redirectUri);
        if (data.enabled !== undefined) setIsEnabled(data.enabled);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/integrations/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId || undefined,
          clientSecret: clientSecret || undefined,
          redirectUri,
          enabled: isEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.maskedClientId) setMaskedClientId(data.maskedClientId);
        setClientId('');
        setClientSecret('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to save settings.');
      }
    } finally {
      setIsSaving(false);
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
            <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            Google Sheets OAuth2 Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure Google Cloud OAuth credentials to allow bidirectional lead spreadsheet import and real-time status writebacks.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          Google Sheets OAuth settings saved securely in AES-256 vault.
        </div>
      )}

      <Card className="glass-panel p-6 space-y-6 border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="font-bold text-white text-sm">OAuth 2.0 Credentials</h3>
            <p className="text-xs text-slate-400 mt-0.5">Obtained from Google Cloud Console under API Credentials.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Client ID:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 font-bold">
              {maskedClientId}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Google OAuth Client ID</label>
            <input
              type="text"
              placeholder="••••••••••••-••••••••.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Google OAuth Client Secret</label>
            <input
              type="password"
              placeholder="GOCSPX-••••••••••••••••••••••••"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Authorized Redirect URI</label>
            <input
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500">Must match the Authorized redirect URI in Google Cloud Console exactly.</p>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
            <div>
              <p className="text-xs font-semibold text-white">Enable Google Sheets Global Sync</p>
              <p className="text-[11px] text-slate-400">Allow users to connect their personal Google Drive accounts for spreadsheet import.</p>
            </div>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Google OAuth Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
