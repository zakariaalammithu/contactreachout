import { describe, expect, it } from 'vitest';
import {
  MANAGED_PLANS,
  creditsForPackage,
  deductBucket,
  deriveSubscriptionDates,
  isManagedPlan,
  validatePackageChange,
} from '@/lib/services/admin-management-policy';

const NOW = new Date('2026-11-02T12:00:00.000Z').getTime();
const ACTIVE_ROW = {
  status: 'active',
  period: 'monthly',
  current_period_end: '2026-11-20T12:00:00.000Z',
};
const EXPIRED_ROW = {
  status: 'expired',
  period: 'monthly',
  current_period_end: '2026-10-20T12:00:00.000Z',
};
const LIFETIME_ROW = { status: 'lifetime', period: 'lifetime', current_period_end: null };

describe('admin management policy', () => {
  it('lists the five managed plans', () => {
    expect(MANAGED_PLANS).toEqual(['Free', 'Starter', 'Growth', 'Agency', 'Enterprise']);
    expect(isManagedPlan('Starter')).toBe(true);
    expect(isManagedPlan('Pro')).toBe(false);
  });

  it('grants period credits for paid plans, none for Free or lifetime', () => {
    expect(creditsForPackage('Starter', 'monthly')).toBe(5000);
    expect(creditsForPackage('Starter', 'yearly')).toBe(60000);
    expect(creditsForPackage('Enterprise', 'yearly')).toBe(3600000);
    expect(creditsForPackage('Free', null)).toBe(0);
    expect(creditsForPackage('Growth', 'lifetime')).toBe(0);
  });

  it('picks a single bucket for deducts, or null when none covers it', () => {
    const wallet = { freeMonthlyCredits: 100, freeMonthlyUsed: 40, paidCredits: 50, bonusCredits: 200 };
    expect(deductBucket(wallet, 50)).toBe('FREE');
    expect(deductBucket(wallet, 60)).toBe('FREE'); // free remainder is exactly 60
    expect(deductBucket(wallet, 61)).toBe('BONUS');
    expect(deductBucket(wallet, 201)).toBe(null);
    expect(deductBucket(wallet, 500)).toBe(null);
  });

  it('extends from the current expiry when it is still in the future', () => {
    const out = deriveSubscriptionDates(ACTIVE_ROW, 'extend', { extendDays: 30 }, NOW);
    expect(out.status).toBe('active');
    expect(out.current_period_end).toBe('2026-12-20T12:00:00.000Z');
  });

  it('extends from today when the old expiry already passed', () => {
    const out = deriveSubscriptionDates(EXPIRED_ROW, 'extend', { extendDays: 30 }, NOW);
    expect(out.current_period_end).toBe('2026-12-02T12:00:00.000Z');
  });

  it('reactivates an expired row for the given days', () => {
    const out = deriveSubscriptionDates(EXPIRED_ROW, 'reactivate', { extendDays: 15 }, NOW);
    expect(out).toEqual({ status: 'active', current_period_end: '2026-11-17T12:00:00.000Z' });
  });

  it('expires a row immediately', () => {
    const out = deriveSubscriptionDates(ACTIVE_ROW, 'expire', {}, NOW);
    expect(out.status).toBe('expired');
    expect(out.current_period_end).toBe('2026-11-02T12:00:00.000Z');
  });

  it('sets explicit dates and derives status from them', () => {
    const future = deriveSubscriptionDates(ACTIVE_ROW, 'set', { startDate: '2026-11-02', endDate: '2026-12-02' }, NOW);
    expect(future.status).toBe('active');
    expect(future.current_period_start).toBe('2026-11-02T00:00:00.000Z');
    const past = deriveSubscriptionDates(ACTIVE_ROW, 'set', { startDate: '2026-09-01', endDate: '2026-10-01' }, NOW);
    expect(past.status).toBe('expired');
  });

  it('rejects invalid date input', () => {
    expect(() => deriveSubscriptionDates(ACTIVE_ROW, 'extend', { extendDays: 0 }, NOW)).toThrow();
    expect(() => deriveSubscriptionDates(ACTIVE_ROW, 'extend', {}, NOW)).toThrow();
    expect(() => deriveSubscriptionDates(ACTIVE_ROW, 'set', { startDate: '2026-12-02', endDate: '2026-11-02' }, NOW)).toThrow(
      'Expiry date must be after the start date.',
    );
  });

  it('rejects every date action on lifetime rows, and missing rows', () => {
    expect(() => deriveSubscriptionDates(LIFETIME_ROW, 'extend', { extendDays: 30 }, NOW)).toThrow(
      'Lifetime access has no expiry date',
    );
    expect(() => deriveSubscriptionDates(null, 'extend', { extendDays: 30 }, NOW)).toThrow('Assign a package first');
  });

  it('validates package changes', () => {
    expect(validatePackageChange('Starter', 'monthly')).toBe(null);
    expect(validatePackageChange('Starter', 'lifetime')).toBe(null);
    expect(validatePackageChange('Free', null)).toBe(null);
    expect(validatePackageChange('Free', 'yearly')).toMatch('no billing period');
    expect(validatePackageChange('Starter', null)).toMatch('need a period');
    expect(validatePackageChange('Pro', 'monthly')).toMatch('Unknown plan');
  });
});
