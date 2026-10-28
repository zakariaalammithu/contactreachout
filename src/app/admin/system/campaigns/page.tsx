'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  Flame,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function GlobalCampaignSettingsPage() {
  const [liveEnabled, setLiveEnabled] = useState(false); // DEFAULT: DISABLED (SAFE DRY-RUN)
  const [dailyLimit, setDailyLimit] = useState(500);
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [interDelay, setInterDelay] = useState(3000);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingLive, setIsConfirmingLive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/system/campaigns');
        if (res.ok) {
          const data = await res.json();
          if (data.globalLiveSubmissionsEnabled !== undefined) {
            setLiveEnabled(data.globalLiveSubmissionsEnabled);
          }
          if (data.globalDailyLimit !== undefined) setDailyLimit(data.globalDailyLimit);
          if (data.globalMaxConcurrency !== undefined) setMaxConcurrency(data.globalMaxConcurrency);
          if (data.defaultInterPageDelayMs !== undefined) setInterDelay(data.defaultInterPageDelayMs);
        }
      } catch (err) {
        console.error('Failed to fetch campaign settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
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
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    // Client-side validation: Quota
    if (dailyLimit < 1 || dailyLimit > 100000) {
      setSaveError('Global Daily Quota Cap must be between 1 and 100,000 leads per day.');
      setIsSaving(false);
      return;
    }

    // Client-side validation: Concurrency
    if (maxConcurrency < 1 || maxConcurrency > 20) {
      setSaveError('Global Max Concurrency must be between 1 and 20 workers.');
      setIsSaving(false);
      return;
    }

    // Client-side validation: Delay
    if (interDelay < 500 || interDelay > 30000) {
      setSaveError('Inter-Page Delay must be between 500ms and 30,000ms.');
      setIsSaving(false);
      return;
    }

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

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save campaign settings.');
      }

      if (data.globalLiveSubmissionsEnabled !== undefined) {
        setLiveEnabled(data.globalLiveSubmissionsEnabled);
      }

      setSaveSuccess(data.message || 'Global campaign policies saved and updated across all active queues.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update campaign settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
            <Sliders className="h-5 w-5" />
          </div>
          <span>Global Campaign Policies & Live Killswitch</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          System-wide outreach governance and high-level live submission safety killswitch.
        </p>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-900 bg-emerald-950 text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Error Banner */}
      {saveError && (
        <div className="p-3.5 rounded-xl border border-red-900 bg-red-950 text-xs font-bold text-red-300 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Global Live Submission Killswitch Card */}
      <Card className="p-6 space-y-4 border-rose-900 bg-rose-950/60 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-400" />
              <h3 className="text-sm font-extrabold text-zinc-100">SYSTEM-WIDE LIVE SUBMISSION KILLSWITCH</h3>
            </div>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              When <strong className="text-zinc-100">DISABLED</strong>, all form submissions across all tenant campaigns operate exclusively in simulated Dry-Run Test Mode. Live network dispatches are strictly forbidden.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                liveEnabled
                  ? 'bg-rose-900 text-rose-300 border-rose-800 animate-pulse'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-900'
              }`}
            >
              LIVE: {isLoading ? 'LOADING...' : liveEnabled ? 'ENABLED (LIVE OUTREACH ACTIVE)' : 'DISABLED (SAFE DRY-RUN)'}
            </span>

            <Button
              type="button"
              variant={liveEnabled ? 'destructive' : 'primary'}
              size="sm"
              disabled={isLoading || isSaving}
              onClick={handleToggleLive}
              className={`font-bold ${
                liveEnabled
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#0e6de4] hover:bg-[#0c5bc2] text-white'
              }`}
            >
              {liveEnabled ? 'Deactivate Live Outbound' : 'Enable Live Outbound'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Rate Limits & Pacing Card */}
      <Card className="p-6 space-y-5 border-zinc-800 bg-zinc-950 shadow-xs">
        <div className="border-b border-zinc-800 pb-3">
          <h3 className="font-extrabold text-zinc-100 text-sm">Global Rate Limits & Pacing</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Define system-wide daily ceilings, concurrency, and navigation delays.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <label className="text-xs font-bold text-zinc-300">Global Daily Quota Cap</label>
              <input
                type="number"
                min="1"
                max="100000"
                disabled={isLoading || isSaving}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono disabled:bg-zinc-900"
              />
              <p className="text-[11px] text-zinc-400 font-mono">Leads / day system ceiling.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <label className="text-xs font-bold text-zinc-300">Global Max Concurrency</label>
              <input
                type="number"
                min="1"
                max="20"
                disabled={isLoading || isSaving}
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono disabled:bg-zinc-900"
              />
              <p className="text-[11px] text-zinc-400 font-mono">Worker threads limit (1-20).</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <label className="text-xs font-bold text-zinc-300">Inter-Page Delay (ms)</label>
              <input
                type="number"
                min="500"
                max="30000"
                step="500"
                disabled={isLoading || isSaving}
                value={interDelay}
                onChange={(e) => setInterDelay(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none font-mono disabled:bg-zinc-900"
              />
              <p className="text-[11px] text-zinc-400 font-mono">Pacing delay (500ms - 30,000ms).</p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
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
                  Save Global Policies
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirmation Modal Before Enabling Live Submissions */}
      {isConfirmingLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 space-y-4 border-rose-900 bg-zinc-950 shadow-xl">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm border-b border-zinc-800 pb-2">
              <Flame className="h-5 w-5" />
              <span>Confirm System-Wide Live Mode Activation</span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Enabling live submissions allows approved campaigns to dispatch real contact-form payloads to target domain websites. Live submissions cannot be undone and will deduct credits for successful messages.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmingLive(false)}
                className="font-bold border-zinc-700 text-zinc-300"
              >
                Cancel (Keep Dry-Run)
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmActivateLive}
                className="font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Live Activation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
