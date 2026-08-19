'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShieldCheck,
  Save,
  CheckCircle2,
  Camera,
  Sliders,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminBrowserSettingsPage() {
  const [workerConcurrency, setWorkerConcurrency] = useState(5);
  const [navigationTimeout, setNavigationTimeout] = useState(30);
  const [screenshotOnSuccess, setScreenshotOnSuccess] = useState(true);
  const [screenshotOnFailure, setScreenshotOnFailure] = useState(true);
  const [mode, setMode] = useState('test');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/system/browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerConcurrency,
          navigationTimeoutSeconds: navigationTimeout,
          screenshotOnSuccess,
          screenshotOnFailure,
          mode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Globe className="h-6 w-6 text-indigo-400" />
          Playwright Browser Automation & Sandbox
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Configure browser isolation, timeouts, visual proof capture, and zero-bypass anti-bot compliance policies.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          Browser automation parameters updated successfully.
        </div>
      )}

      <Card className="glass-panel p-6 space-y-6 border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="font-bold text-white text-sm">Execution Engine Controls</h3>
            <p className="text-xs text-slate-400 mt-0.5">Headless browser sandbox with SSRF protection.</p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            MODE: {mode.toUpperCase()}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300">Max Browser Concurrency</label>
              <input
                type="number"
                min="1"
                max="10"
                value={workerConcurrency}
                onChange={(e) => setWorkerConcurrency(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500">Default: 5 concurrent browser tabs.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300">Navigation Timeout (Seconds)</label>
              <input
                type="number"
                min="10"
                max="60"
                value={navigationTimeout}
                onChange={(e) => setNavigationTimeout(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500">Terminates hung destination pages cleanly.</p>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-purple-400" />
              Visual Screenshot Proof Capture
            </h4>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs text-slate-300 font-semibold">Screenshot on Pre-Submission & Success</p>
                <p className="text-[11px] text-slate-500">Saves filled form view into audit results table.</p>
              </div>
              <input
                type="checkbox"
                checked={screenshotOnSuccess}
                onChange={(e) => setScreenshotOnSuccess(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs text-slate-300 font-semibold">Screenshot on Failure / Protection State</p>
                <p className="text-[11px] text-slate-500">Captures CAPTCHA or blocking element for human review triage.</p>
              </div>
              <input
                type="checkbox"
                checked={screenshotOnFailure}
                onChange={(e) => setScreenshotOnFailure(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Zero Bypass Protection Policy */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              ZERO-BYPASS ANTI-BOT COMPLIANCE POLICY
            </div>
            <p className="text-[11px] leading-relaxed text-amber-300/90">
              The Playwright automation engine <strong>strictly obeys website protection markers</strong> (Google reCAPTCHA, Cloudflare Turnstile, hCaptcha). If protection is detected, the lead is immediately routed to <code>REVIEW_REQUIRED</code>.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit">
              <Save className="h-4 w-4 mr-1.5" />
              Save Browser Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
