'use client';

import React from 'react';
import { estimateSendingSchedule } from '@/lib/services/sending-estimate';

interface SendingProgressCardProps {
  campaignName: string;
  isDryRun: boolean;
  total: number;
  sent: number;
  failed: number;
  upNext: string;
  dailyLimit: number;
  sendingWeekdays: number[];
  availableCredits: number | null;
  onPause: (e: React.MouseEvent) => void;
}

/**
 * Live sending status card, shown at the top of the campaigns list while a
 * campaign is running. It appears the moment a started campaign lands on
 * this page (the sender loop itself runs here), and it stays live because
 * the page re-renders on every campaign update. Counts come from the
 * campaign's canonical metrics; credits used is 1 per successful
 * submission, matching the credit rule. The finish estimate counts only
 * configured sending days. Dry runs are labeled as simulations and never
 * show live credit use.
 */
export function SendingProgressCard({
  campaignName,
  isDryRun,
  total,
  sent,
  failed,
  upNext,
  dailyLimit,
  sendingWeekdays,
  availableCredits,
  onPause,
}: SendingProgressCardProps) {
  const remaining = Math.max(0, total - sent - failed);
  const done = sent + failed;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const creditsUsed = isDryRun ? 0 : sent;
  const creditsLeft = availableCredits !== null ? Math.max(0, availableCredits - creditsUsed) : null;
  const estimate = estimateSendingSchedule({ remaining, dailyLimit, sendingWeekdays });
  const finishLabel =
    remaining <= 0
      ? 'Complete'
      : estimate.calendarDays <= 0
        ? 'Today'
        : estimate.calendarDays === 1
          ? 'Tomorrow'
          : `In ${estimate.calendarDays} days · ${estimate.finishDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;

  return (
    <section aria-label={`Sending progress for ${campaignName}`} className="sending-progress-card rounded-2xl border border-blue-900/70 bg-gradient-to-br from-blue-950/70 via-zinc-950 to-zinc-950 p-5 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="relative mt-1 flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#0e6de4]" />
          </span>
          <div>
            <p className="text-sm font-black text-zinc-100">
              {isDryRun ? 'Dry run in progress — simulating, no live submissions' : 'Sending messages…'}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-zinc-400">
              {campaignName} · {done} of {total} processed
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onPause}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-900"
        >
          Pause sending
        </button>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-[#0e6de4] transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-right text-[11px] font-bold text-zinc-400">{percent}% complete</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Sent</p>
          <p className="mt-0.5 text-lg font-black text-emerald-400">{sent}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Failed</p>
          <p className="mt-0.5 text-lg font-black text-rose-400">{failed}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Remaining</p>
          <p className="mt-0.5 text-lg font-black text-zinc-100">{remaining}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Credits used</p>
          <p className="mt-0.5 text-lg font-black text-blue-400">
            {creditsUsed}
            {creditsLeft !== null && <span className="ml-1 text-xs font-bold text-zinc-400">/ {creditsLeft} left</span>}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-zinc-400">
        <span>
          Estimated finish: <strong className="text-zinc-100">{finishLabel}</strong>
          {remaining > 0 && (
            <span className="text-zinc-500"> · {estimate.sendingDaysNeeded} sending day{estimate.sendingDaysNeeded === 1 ? '' : 's'} at {dailyLimit > 0 ? `${dailyLimit}/day` : 'no daily cap'}</span>
          )}
        </span>
        {remaining > 0 && upNext && (
          <span>
            Up next: <strong className="text-zinc-100">{upNext}</strong>
          </span>
        )}
        {remaining <= 0 && <span>All prospects processed.</span>}
      </div>

      <p className="mt-2 text-[11px] leading-4 text-zinc-500">
        Keep this page open — sending pauses if you close it. Progress updates live as each form is submitted.
      </p>
    </section>
  );
}
