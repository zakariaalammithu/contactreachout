import { describe, expect, it } from 'vitest';
import { countDeliveredLast24h, getLogTimestampMs, DAY_MS } from '@/lib/services/campaign-24h';

const NOW = new Date('2026-11-02T10:00:00.000Z').getTime();
const iso = (ms) => new Date(ms).toISOString();
const HOUR = 60 * 60 * 1000;

describe('getLogTimestampMs', () => {
  it('prefers completedAt (telemetry) over startedAt and timestamp', () => {
    expect(
      getLogTimestampMs({ completedAt: iso(NOW - HOUR), startedAt: iso(NOW - 2 * HOUR), timestamp: iso(NOW - 3 * HOUR) }),
    ).toBe(NOW - HOUR);
  });

  it('falls back to startedAt, then timestamp, and rejects unparseable values', () => {
    expect(getLogTimestampMs({ startedAt: iso(NOW - HOUR) })).toBe(NOW - HOUR);
    expect(getLogTimestampMs({ timestamp: iso(NOW - HOUR) })).toBe(NOW - HOUR);
    expect(getLogTimestampMs({ timestamp: 'not-a-date' })).toBeNull();
    expect(getLogTimestampMs({})).toBeNull();
  });
});

describe('countDeliveredLast24h', () => {
  it('returns 0 for empty, missing, or non-array logs', () => {
    expect(countDeliveredLast24h([], NOW)).toBe(0);
    expect(countDeliveredLast24h(null, NOW)).toBe(0);
    expect(countDeliveredLast24h(undefined, NOW)).toBe(0);
  });

  it('counts a verified DELIVERED send inside the window', () => {
    expect(
      countDeliveredLast24h([{ leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW - HOUR) }], NOW),
    ).toBe(1);
  });

  it('counts a DELIVERED send exactly 24h ago (inclusive lower bound)', () => {
    expect(
      countDeliveredLast24h([{ leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW - DAY_MS) }], NOW),
    ).toBe(1);
  });

  it('excludes a DELIVERED send older than 24h', () => {
    expect(
      countDeliveredLast24h([{ leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW - DAY_MS - 1000) }], NOW),
    ).toBe(0);
  });

  it('never counts FAILED, REVIEW, NO-FORM, or uncertain outcomes', () => {
    const logs = [
      { leadId: 'l1', status: 'FAILED', completedAt: iso(NOW - HOUR) },
      { leadId: 'l2', status: 'REVIEW', completedAt: iso(NOW - HOUR) },
      { leadId: 'l3', status: 'NO-FORM', completedAt: iso(NOW - HOUR) },
      { leadId: 'l4', status: 'SUBMIT_FAILED', completedAt: iso(NOW - HOUR) },
      { leadId: 'l5', status: 'UNREACHABLE', completedAt: iso(NOW - HOUR) },
    ];
    expect(countDeliveredLast24h(logs, NOW)).toBe(0);
  });

  it('ignores SCHEDULED entries entirely', () => {
    expect(
      countDeliveredLast24h([{ leadId: 'l1', status: 'SCHEDULED', completedAt: iso(NOW - HOUR) }], NOW),
    ).toBe(0);
  });

  it('counts one outcome per lead: the newest entry wins', () => {
    // Newest-first storage: a newer FAILED replaces an older DELIVERED.
    const logs = [
      { leadId: 'l1', status: 'FAILED', completedAt: iso(NOW - HOUR) },
      { leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW - 2 * HOUR) },
    ];
    expect(countDeliveredLast24h(logs, NOW)).toBe(0);
  });

  it('counts the same lead only once even with duplicate DELIVERED entries', () => {
    const logs = [
      { leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW - HOUR) },
      { leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW - 2 * HOUR) },
    ];
    expect(countDeliveredLast24h(logs, NOW)).toBe(1);
  });

  it('dedupes by canonical domain when there is no lead id', () => {
    const logs = [
      { domain: 'https://www.example.com/contact', status: 'DELIVERED', completedAt: iso(NOW - HOUR) },
      { domain: 'example.com', status: 'DELIVERED', completedAt: iso(NOW - 2 * HOUR) },
    ];
    expect(countDeliveredLast24h(logs, NOW)).toBe(1);
  });

  it('excludes undated DELIVERED entries (fail-closed)', () => {
    expect(countDeliveredLast24h([{ leadId: 'l1', status: 'DELIVERED' }], NOW)).toBe(0);
  });

  it('tolerates a few minutes of future clock skew, but not more', () => {
    expect(
      countDeliveredLast24h([{ leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW + 4 * 60 * 1000) }], NOW),
    ).toBe(1);
    expect(
      countDeliveredLast24h([{ leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW + 60 * 60 * 1000) }], NOW),
    ).toBe(0);
  });

  it('counts each lead separately', () => {
    const logs = [
      { leadId: 'l1', status: 'DELIVERED', completedAt: iso(NOW - HOUR) },
      { leadId: 'l2', status: 'DELIVERED', completedAt: iso(NOW - 2 * HOUR) },
      { leadId: 'l3', status: 'DELIVERED', completedAt: iso(NOW - 30 * HOUR) },
    ];
    expect(countDeliveredLast24h(logs, NOW)).toBe(2);
  });
});
