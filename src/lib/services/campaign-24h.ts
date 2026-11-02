/**
 * Last-24-hours (24H) verified-delivered count for the campaigns list
 * (ManyReach-style 24H column, 2026-11-02).
 *
 * Display-only: this reads a campaign's own stored submission logs and
 * never touches sending, scheduling, or any other campaign logic.
 *
 * Counting rules (mirroring the list's canonical DELIVERED definition):
 * - One outcome per lead: the newest non-SCHEDULED log entry wins, exactly
 *   like getCanonicalCampaignCounts in the campaigns page.
 * - Only status DELIVERED counts. FAILED, PENDING, REVIEW, NO-FORM, and
 *   uncertain outcomes never count.
 * - Only entries whose send moment falls inside the rolling 24-hour window
 *   [now - 24h, now + 5min] count. The +5min tolerance covers client/server
 *   clock skew; anything older, undated, or unparseable is excluded
 *   (fail-closed: an unverifiable send is never counted as delivered).
 * - Send moment: telemetry entries (the process route's real submissions)
 *   carry completedAt/startedAt, NOT timestamp; manually written entries
 *   carry timestamp. completedAt wins, then startedAt, then timestamp.
 *   The locale `time` string is display-only and is never parsed.
 */

export type Campaign24hLogLike = {
  status?: unknown;
  finalStatus?: unknown;
  leadId?: unknown;
  domain?: unknown;
  url?: unknown;
  website?: unknown;
  completedAt?: unknown;
  startedAt?: unknown;
  timestamp?: unknown;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

export function getLogTimestampMs(log: Campaign24hLogLike): number | null {
  for (const value of [log.completedAt, log.startedAt, log.timestamp]) {
    if (typeof value === 'string' || typeof value === 'number') {
      const ms = new Date(value).getTime();
      if (!Number.isNaN(ms)) return ms;
    }
  }
  return null;
}

function leadKey(log: Campaign24hLogLike): string | null {
  if (log.leadId !== undefined && log.leadId !== null && String(log.leadId).trim() !== '') {
    return String(log.leadId).trim();
  }
  const raw = String(log.domain || log.url || log.website || '').trim();
  if (!raw) return null;
  return raw
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .replace(/^www[0-9]*\./i, '')
    .replace(/^m\./i, '')
    .toLowerCase();
}

export function countDeliveredLast24h(
  logs: Campaign24hLogLike[] | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (!Array.isArray(logs)) return 0;
  // Logs are stored newest-first; iterate oldest-first so the newest
  // entry per lead overwrites (same rule as the canonical counts).
  const latest = new Map<string, { status: string; ts: number | null }>();
  for (const log of [...logs].reverse()) {
    if (!log || typeof log !== 'object') continue;
    const status = String(log.status || log.finalStatus || '').toUpperCase();
    if (status === 'SCHEDULED') continue;
    const key = leadKey(log);
    if (!key) continue;
    latest.set(key, { status, ts: getLogTimestampMs(log) });
  }
  const windowStart = nowMs - DAY_MS;
  const windowEnd = nowMs + CLOCK_SKEW_TOLERANCE_MS;
  let count = 0;
  for (const entry of latest.values()) {
    if (entry.status !== 'DELIVERED') continue;
    if (entry.ts === null) continue;
    if (entry.ts >= windowStart && entry.ts <= windowEnd) count++;
  }
  return count;
}
