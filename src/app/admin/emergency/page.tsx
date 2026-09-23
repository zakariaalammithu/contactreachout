'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { Shield, ShieldAlert, AlertOctagon, CheckCircle2, PauseCircle, PlayCircle, Lock } from 'lucide-react';

export default function EmergencyControlsPage() {
  const [killswitchActive, setKillswitchActive] = useState(false);
  const [campaignsPaused, setCampaignsPaused] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const toggleKillswitch = () => {
    const nextState = !killswitchActive;
    setKillswitchActive(nextState);
    setStatusMessage(
      nextState
        ? 'Emergency Killswitch ACTIVATED. All outbound workers halted.'
        : 'Emergency Killswitch DEACTIVATED. System restored to normal operation.'
    );
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const togglePauseCampaigns = () => {
    const nextState = !campaignsPaused;
    setCampaignsPaused(nextState);
    setStatusMessage(
      nextState
        ? 'All active campaign dispatches PAUSED.'
        : 'Campaign dispatches RESUMED.'
    );
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">
              Emergency Controls & System Override
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              High-priority security overrides, worker killswitch, and emergency rate limiting safeguards.
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 shadow-2xs ${
          killswitchActive ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <AlertOctagon className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Controls Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Master Killswitch Control */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
              killswitchActive ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
            }`}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#111827] text-sm">Master Worker Killswitch</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Immediately stop all queue worker execution across all nodes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleKillswitch}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-xs ${
              killswitchActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {killswitchActive ? 'Deactivate Killswitch' : 'Activate Killswitch'}
          </button>
        </div>

        {/* Campaign Pause Control */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-200 text-[#0e6de4] flex items-center justify-center shrink-0">
              <PauseCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#111827] text-sm">Global Campaign Dispatch Pause</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Freeze active outreach dispatch while keeping workers operational for background tasks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={togglePauseCampaigns}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-xs ${
              campaignsPaused
                ? 'bg-[#0e6de4] hover:bg-[#0758bd] text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {campaignsPaused ? 'Resume Campaigns' : 'Pause All Campaigns'}
          </button>
        </div>
      </div>
    </div>
  );
}
