'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminBrowserSettingsPage() {
  const [workerConcurrency, setWorkerConcurrency] = useState(5);
  const [navigationTimeout, setNavigationTimeout] = useState(30);
  const [screenshotOnSuccess, setScreenshotOnSuccess] = useState(true);
  const [screenshotOnFailure, setScreenshotOnFailure] = useState(true);
  const [mode, setMode] = useState('TEST');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/system/browser');
        if (res.ok) {
          const data = await res.json();
          if (data.workerConcurrency !== undefined) setWorkerConcurrency(data.workerConcurrency);
          if (data.navigationTimeoutSeconds !== undefined) setNavigationTimeout(data.navigationTimeoutSeconds);
          if (data.screenshotOnSuccess !== undefined) setScreenshotOnSuccess(data.screenshotOnSuccess);
          if (data.screenshotOnFailure !== undefined) setScreenshotOnFailure(data.screenshotOnFailure);
          if (data.mode) setMode(data.mode.toUpperCase());
        }
      } catch (err) {
        console.error('Failed to fetch browser settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    // Client-side validation: Concurrency
    if (workerConcurrency < 1 || workerConcurrency > 20) {
      setSaveError('Max Browser Concurrency must be between 1 and 20.');
      setIsSaving(false);
      return;
    }

    // Client-side validation: Timeout
    if (navigationTimeout < 5 || navigationTimeout > 120) {
      setSaveError('Navigation Timeout must be between 5 and 120 seconds.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/system/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerConcurrency,
          navigationTimeoutSeconds: navigationTimeout,
          screenshotOnSuccess,
          screenshotOnFailure,
          mode: mode.toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save browser settings.');
      }

      if (data.mode) setMode(data.mode.toUpperCase());
      setSaveSuccess(data.message || 'Browser automation parameters updated and saved successfully.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update browser settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
            <Globe className="h-5 w-5" />
          </div>
          <span>Playwright Browser Automation & Sandbox</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure browser isolation, timeouts, visual proof capture, and zero-bypass anti-bot compliance policies.
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

      {/* Main Settings Card */}
      <Card className="p-6 space-y-6 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Execution Engine Controls</h3>
            <p className="text-xs text-slate-500 mt-0.5">Headless browser sandbox with SSRF protection.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-500 font-medium">Runtime Mode:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                mode === 'LIVE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : mode === 'DISABLED'
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-blue-50 border-blue-200 text-[#0e6de4]'
              }`}
            >
              MODE: {isLoading ? 'LOADING...' : mode}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="text-xs font-bold text-slate-700">Max Browser Concurrency</label>
              <input
                type="number"
                min="1"
                max="20"
                disabled={isLoading || isSaving}
                value={workerConcurrency}
                onChange={(e) => setWorkerConcurrency(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 font-mono">Limit: 1 to 20 concurrent browser threads.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="text-xs font-bold text-slate-700">Navigation Timeout (Seconds)</label>
              <input
                type="number"
                min="5"
                max="120"
                disabled={isLoading || isSaving}
                value={navigationTimeout}
                onChange={(e) => setNavigationTimeout(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 font-mono">Limit: 5 to 120 seconds per page load.</p>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-[#0e6de4]" />
              Visual Screenshot Proof Capture
            </h4>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs text-slate-800 font-bold">Screenshot on Pre-Submission & Success</p>
                <p className="text-[11px] text-slate-500">Saves filled form view into audit results table.</p>
              </div>
              <input
                type="checkbox"
                checked={screenshotOnSuccess}
                onChange={(e) => setScreenshotOnSuccess(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0e6de4] focus:ring-[#0e6de4] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs text-slate-800 font-bold">Screenshot on Failure / Protection State</p>
                <p className="text-[11px] text-slate-500">Captures CAPTCHA or blocking element for human review triage.</p>
              </div>
              <input
                type="checkbox"
                checked={screenshotOnFailure}
                onChange={(e) => setScreenshotOnFailure(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0e6de4] focus:ring-[#0e6de4] cursor-pointer"
              />
            </div>
          </div>

          {/* Zero Bypass Protection Policy */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              ZERO-BYPASS ANTI-BOT COMPLIANCE POLICY
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              The Playwright automation engine <strong className="text-amber-950 font-bold">strictly obeys website protection markers</strong> (Google reCAPTCHA, Cloudflare Turnstile, hCaptcha). If protection is detected, automated submission stops and the lead is routed to <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono font-bold">REVIEW_REQUIRED</code> with 0 credit cost.
            </p>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSaving || isLoading}
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
                  Save Browser Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
