/**
 * Pure pacing policy for the campaign runner (the /campaigns loop).
 * Kept free of React so it can be unit-tested: sequential execution,
 * the configured delay between submissions, and the daily limit are
 * decided here, and the loop enforces them.
 */
import { CANONICAL_DEFAULT_SAFETY_CONFIG } from './processing-controls-service';

export function resolveSubmissionDelayMs(campaign: {
  submissionDelaySeconds?: number | null;
}): number {
  const seconds = campaign.submissionDelaySeconds ?? CANONICAL_DEFAULT_SAFETY_CONFIG.submissionDelaySeconds;
  return Math.max(0, Number(seconds) || 0) * 1000;
}

export function resolveDailySubmissionLimit(campaign: {
  dailySubmissionLimit?: number | null;
}): number {
  const limit = campaign.dailySubmissionLimit ?? CANONICAL_DEFAULT_SAFETY_CONFIG.dailySubmissionLimit;
  return Math.max(1, Number(limit) || 1);
}

interface RunnerLogLike {
  status?: string;
  timestamp?: string;
}

/**
 * Count DELIVERED outcomes dated today (local calendar day of the
 * browser running the campaign). Only logs with a parseable timestamp
 * count; undated logs are ignored rather than guessed.
 */
export function countDeliveredToday(logs: RunnerLogLike[], now = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return logs.filter((log) => {
    if (String(log.status || '').toUpperCase() !== 'DELIVERED') return false;
    if (!log.timestamp) return false;
    const t = new Date(log.timestamp);
    return !Number.isNaN(t.getTime()) && t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  }).length;
}

/** ISO timestamp for tomorrow at local midnight (daily-limit deferral). */
export function nextDayMidnightISO(now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).toISOString();
}

/** True when the configured delay has elapsed since the last attempt. */
export function isDelayElapsed(lastAtMs: number | undefined, delayMs: number, nowMs = Date.now()): boolean {
  if (!lastAtMs || delayMs <= 0) return true;
  return nowMs - lastAtMs >= delayMs;
}
