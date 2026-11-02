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
  Server,
  Lock,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function GoogleSheetsSettingsPage() {
  const [maskedClientId, setMaskedClientId] = useState('NOT_CONFIGURED');
  const [statusText, setStatusText] = useState('Managed via Server Environment');
  const [source, setSource] = useState<'env' | 'global' | 'user' | 'none'>('env');
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const [redirectUri, setRedirectUri] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/integrations/google-sheets');
      if (res.ok) {
        const data = await res.json();
        if (data.maskedClientId) setMaskedClientId(data.maskedClientId);
        if (data.redirectUri) setRedirectUri(data.redirectUri);
        if (data.isConfigured !== undefined) setIsConfigured(data.isConfigured);
        if (data.statusText) setStatusText(data.statusText);
        if (data.source) setSource(data.source);
        setIsOverrideActive(Boolean(data.isOverrideActive));
      }
    } catch (err) {
      console.error('Failed to fetch Google Sheets config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setRedirectUri(`${origin}/api/admin/integrations/google-sheets/callback`);
    }
    fetchConfig();
  }, []);

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
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span>Google Sheets OAuth2 Integration</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Google Cloud OAuth credentials for bidirectional spreadsheet imports and lead status sync.
          </p>
        </div>
      </div>

      {/* Settings Form Card */}
      <Card className="p-6 space-y-6 border-zinc-800 bg-zinc-950 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-extrabold text-zinc-100 text-sm">OAuth 2.0 Credential Status</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Google Cloud Console OAuth App configuration.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

        {/* Status Banner */}
        {isOverrideActive ? (
          <div className="p-4 rounded-xl border border-amber-900 bg-amber-950 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>An encrypted vault override is currently active for Google OAuth.</span>
            </div>
            <p className="text-amber-300 leading-relaxed pl-6">
              Dashboard key editing is disabled under environment-only mode. This temporary override lapses when the instance recycles — the lasting values must be set in server environment.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-blue-900 bg-blue-950/60 text-zinc-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-zinc-100">Google OAuth is currently using the secure server environment configuration.</p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Credentials come from server environment only. Dashboard editing is disabled under environment-only mode.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-blue-400" />
              Google OAuth Client ID
            </label>
            <p className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 font-mono">{maskedClientId}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Authorized Redirect URI</label>
            <p className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 font-mono">{redirectUri}</p>
            <p className="text-[11px] text-zinc-400">
              Must match the Authorized redirect URI configured in Google Cloud Console exactly.
            </p>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            OAuth credentials are read from server environment only (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI). Dashboard editing is disabled under environment-only mode — update Vercel Environment Variables and redeploy to change them.
          </p>
        </div>
      </Card>
    </div>
  );
}

