'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Loader2,
  Info,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function GoogleSheetsSettingsPage() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [maskedClientId, setMaskedClientId] = useState('NOT_CONFIGURED');
  const [statusText, setStatusText] = useState('Not Configured');
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Default to dynamic localhost port or current origin
  const [redirectUri, setRedirectUri] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/integrations/google-sheets');
        if (res.ok) {
          const data = await res.json();
          if (data.maskedClientId) setMaskedClientId(data.maskedClientId);
          if (data.redirectUri) setRedirectUri(data.redirectUri);
          if (data.enabled !== undefined) setIsEnabled(data.enabled);
          if (data.isConfigured !== undefined) setIsConfigured(data.isConfigured);
          if (data.statusText) setStatusText(data.statusText);
        }
      } catch (err) {
        console.error('Failed to fetch Google Sheets config:', err);
      } finally {
        setIsLoading(false);
      }
    }

    // Set fallback redirect URI based on current browser window location if needed
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setRedirectUri(`${origin}/api/admin/integrations/google-sheets/callback`);
    }

    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    // Client-side validation: Client ID format check
    if (clientId && clientId.trim().includes('@')) {
      setSaveError(
        'Invalid Google OAuth Client ID: Email addresses (e.g. user@gmail.com) cannot be used as Client IDs. Client IDs typically end with "*.apps.googleusercontent.com".'
      );
      setIsSaving(false);
      return;
    }

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

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Google Sheets settings.');
      }

      if (data.maskedClientId) setMaskedClientId(data.maskedClientId);
      if (data.isConfigured !== undefined) setIsConfigured(data.isConfigured);
      if (data.statusText) setStatusText(data.statusText);

      setClientId('');
      setClientSecret('');
      setSaveSuccess(data.message || 'Google Sheets OAuth configuration saved securely in encrypted vault.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
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
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span>Google Sheets OAuth2 Configuration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure Google Cloud OAuth credentials to allow bidirectional lead spreadsheet import and real-time status writebacks.
          </p>
        </div>
      </div>

      {/* Success Feedback Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Error Feedback Alert */}
      {saveError && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Settings Form Card */}
      <Card className="p-6 space-y-6 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">OAuth 2.0 Credentials</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Obtained from Google Cloud Console under API Credentials (must end with .apps.googleusercontent.com).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-500 font-medium">Status:</span>
            <span
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${
                isConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {isLoading ? 'Checking...' : statusText}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-[#0e6de4]" />
              Google OAuth Client ID
            </label>
            <input
              type="text"
              placeholder="1234567890-abcdef.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
              <span>Current Key: {maskedClientId}</span>
              <span className="text-amber-700 font-sans font-semibold">Do not use email addresses as Client ID</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Google OAuth Client Secret</label>
            <input
              type="password"
              placeholder="GOCSPX-••••••••••••••••••••••••"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500 font-mono">
              Leave blank to keep existing encrypted Client Secret unchanged.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Authorized Redirect URI</label>
            <input
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Must match the Authorized redirect URI configured in Google Cloud Console exactly.
            </p>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
            <div>
              <p className="text-xs font-bold text-slate-900">Enable Google Sheets Global Sync</p>
              <p className="text-[11px] text-slate-500">
                Allow authorized users to connect their personal Google Drive accounts for spreadsheet lead imports.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0e6de4] focus:ring-[#0e6de4] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
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
                  Save Google OAuth Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
