'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  Flame,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function GlobalCampaignSettingsPage() {
  const [liveEnabled, setLiveEnabled] = useState(false); // DEFAULT: DISABLED
  const [dailyLimit, setDailyLimit] = useState(500);
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [interDelay, setInterDelay] = useState(3000);
  const [isConfirmingLive, setIsConfirmingLive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/system/campaigns')
      .then((res) => res.json())
      .then((data) => {
        if (data.globalLiveSubmissionsEnabled !== undefined) {
          setLiveEnabled(data.globalLiveSubmissionsEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleLive = () => {
    if (!liveEnabled) {
      setIsConfirmingLive(true);
    } else {
      setLiveEnabled(false);
    }
  };

  const confirmActivateLive = () => {
    setLiveEnabled(true);
    setIsConfirmingLive(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/system/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableLiveSubmissions: liveEnabled,
          globalDailyLimit: dailyLimit,
          globalMaxConcurrency: maxConcurrency,
          defaultInterPageDelayMs: interDelay,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sliders className="h-6 w-6 text-indigo-400" />
          Global Campaign Policies & Live Killswitch
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          System-wide outreach governance and high-level live submission safety killswitch.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          Global campaign policies saved and updated across all active queues.
        </div>
      )}

      {/* Global Live Submission Killswitch Card (Primary Safety Guard) */}
      <Card className="glass-panel p-6 space-y-4 border-rose-500/30 bg-gradient-to-r from-rose-950/20 via-slate-900/60 to-slate-950/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">SYSTEM-WIDE LIVE SUBMISSION KILLSWITCH</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              When <strong>DISABLED</strong>, all form submissions across all tenant campaigns operate exclusively in simulated Dry-Run Test Mode. Live network dispatches are strictly forbidden.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold border ${
                liveEnabled
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-950'
                  : 'bg-slate-950 text-emerald-400 border-emerald-500/30'
              }`}
            >
              LIVE: {liveEnabled ? 'ENABLED (LIVE OUTREACH ACTIVE)' : 'DISABLED (SAFE DRY-RUN)'}
            </span>

            <Button
              type="button"
              variant={liveEnabled ? 'destructive' : 'primary'}
              size="sm"
              onClick={handleToggleLive}
              className="font-bold"
            >
              {liveEnabled ? 'Deactivate Live Outbound' : 'Enable Live Outbound'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Policy Form */}
      <Card className="glass-panel p-6 space-y-5 border-white/[0.08]">
        <h3 className="font-bold text-white text-sm">Global Rate Limits & Pacing</h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300">Global Daily Quota Cap</label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500">Leads / day ceiling.</p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300">Global Max Concurrency</label>
              <input
                type="number"
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500">Global worker limit.</p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300">Inter-Page Delay (ms)</label>
              <input
                type="number"
                value={interDelay}
                onChange={(e) => setInterDelay(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500">Default: 3,000ms.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit">
              <Save className="h-4 w-4 mr-1.5" />
              Save Global Policies
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirmation Modal Before Enabling Live Submissions */}
      {isConfirmingLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-md p-6 space-y-4 border-rose-500/40 bg-slate-950">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <Flame className="h-5 w-5" />
              <span>Confirm System-Wide Live Mode Activation</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enabling live submissions allows approved campaigns to dispatch live form payloads to third-party target domains. Live submissions cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsConfirmingLive(false)}>
                Cancel (Keep Dry-Run)
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmActivateLive}>
                Confirm Live Activation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
