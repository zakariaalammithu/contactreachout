import { describe, it, expect } from 'vitest';
import { resolveSubmissionDelayMs, resolveDailySubmissionLimit, countDeliveredToday, nextDayMidnightISO, isDelayElapsed } from '../src/lib/services/campaign-runner-policy.ts';

describe('campaign runner policy (sequential pacing)', () => {
  it('uses the campaign delay, defaulting to 5s', () => {
    expect(resolveSubmissionDelayMs({ submissionDelaySeconds: 10 })).toBe(10_000);
    expect(resolveSubmissionDelayMs({})).toBe(5_000);
    expect(resolveSubmissionDelayMs({ submissionDelaySeconds: 0 })).toBe(0);
  });

  it('uses the campaign daily limit, defaulting to 100', () => {
    expect(resolveDailySubmissionLimit({ dailySubmissionLimit: 25 })).toBe(25);
    expect(resolveDailySubmissionLimit({})).toBe(100);
  });

  it('counts only today’s DELIVERED logs', () => {
    const now = new Date(2026, 9, 29, 14, 0, 0);
    const logs = [
      { status: 'DELIVERED', timestamp: new Date(2026, 9, 29, 10, 0, 0).toISOString() },
      { status: 'DELIVERED', timestamp: new Date(2026, 9, 28, 10, 0, 0).toISOString() },
      { status: 'FAILED', timestamp: new Date(2026, 9, 29, 11, 0, 0).toISOString() },
      { status: 'DELIVERED' },
    ];
    expect(countDeliveredToday(logs, now)).toBe(1);
  });

  it('defers to tomorrow local midnight', () => {
    const now = new Date(2026, 9, 29, 14, 30, 0);
    const retry = new Date(nextDayMidnightISO(now));
    expect(retry.getFullYear()).toBe(2026);
    expect(retry.getMonth()).toBe(9);
    expect(retry.getDate()).toBe(30);
    expect(retry.getHours()).toBe(0);
  });

  it('enforces the delay gate', () => {
    expect(isDelayElapsed(undefined, 5000, 100_000)).toBe(true);
    expect(isDelayElapsed(90_000, 5000, 100_000)).toBe(true);
    expect(isDelayElapsed(98_000, 5000, 100_000)).toBe(false);
    expect(isDelayElapsed(98_000, 0, 100_000)).toBe(true);
  });
});
