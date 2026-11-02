import { describe, expect, it } from 'vitest';
import {
  isSubscriptionExpired,
  getDaysRemaining,
  isExpiringWithin,
  decideSendingAccess,
  reminderIdempotencyKey,
  normalizeStripeSubscriptionStatus,
} from '@/lib/services/subscription-policy';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-02T10:00:00Z');

function sub(overrides) {
  return {
    id: 'sub-1',
    status: 'active',
    current_period_end: new Date(NOW + 3 * DAY).toISOString(),
    cancel_at_period_end: false,
    ...overrides,
  };
}

describe('isSubscriptionExpired', () => {
  it('active and past_due keep access, even with a near period end', () => {
    expect(isSubscriptionExpired(sub({ status: 'active' }), NOW)).toBe(false);
    expect(isSubscriptionExpired(sub({ status: 'past_due' }), NOW)).toBe(false);
  });

  it('expired status blocks regardless of period end', () => {
    expect(isSubscriptionExpired(sub({ status: 'expired' }), NOW)).toBe(true);
  });

  it('immediate cancellation blocks now; at-period-end cancellation blocks only after the end', () => {
    expect(
      isSubscriptionExpired(sub({ status: 'cancelled', cancel_at_period_end: false }), NOW),
    ).toBe(true);
    expect(
      isSubscriptionExpired(sub({ status: 'cancelled', cancel_at_period_end: true }), NOW),
    ).toBe(false);
    expect(
      isSubscriptionExpired(
        sub({ status: 'cancelled', cancel_at_period_end: true }),
        NOW + 4 * DAY,
      ),
    ).toBe(true);
  });

  it('paused and incomplete do not block (edge states, visible to admin)', () => {
    expect(isSubscriptionExpired(sub({ status: 'paused' }), NOW)).toBe(false);
    expect(isSubscriptionExpired(sub({ status: 'incomplete' }), NOW)).toBe(false);
  });
});

describe('getDaysRemaining / isExpiringWithin', () => {
  it('ceil-days remaining; 0 once passed; null without a period end', () => {
    expect(getDaysRemaining(new Date(NOW + 3 * DAY).toISOString(), NOW)).toBe(3);
    expect(getDaysRemaining(new Date(NOW + 12 * 60 * 60 * 1000).toISOString(), NOW)).toBe(1);
    expect(getDaysRemaining(new Date(NOW - DAY).toISOString(), NOW)).toBe(0);
    expect(getDaysRemaining(null, NOW)).toBe(null);
  });

  it('window is (now, now+days]: past and exactly-now excluded, horizon included', () => {
    expect(isExpiringWithin(new Date(NOW + 5 * DAY).toISOString(), 5, NOW)).toBe(true);
    expect(isExpiringWithin(new Date(NOW + 6 * DAY).toISOString(), 5, NOW)).toBe(false);
    expect(isExpiringWithin(new Date(NOW - DAY).toISOString(), 5, NOW)).toBe(false);
    expect(isExpiringWithin(null, 5, NOW)).toBe(false);
  });
});

describe('decideSendingAccess', () => {
  it('blocks only expired-without-active; free and one-time users (no rows) pass', () => {
    expect(decideSendingAccess({ hasActiveSubscription: false, hasExpiredSubscription: true }).blocked).toBe(true);
    expect(decideSendingAccess({ hasActiveSubscription: true, hasExpiredSubscription: true }).blocked).toBe(false);
    expect(decideSendingAccess({ hasActiveSubscription: false, hasExpiredSubscription: false }).blocked).toBe(false);
    expect(decideSendingAccess({ hasActiveSubscription: true, hasExpiredSubscription: false }).blocked).toBe(false);
  });
});

describe('reminderIdempotencyKey', () => {
  it('one key per subscription x period-end day x type', () => {
    expect(reminderIdempotencyKey('sub-1', '2026-11-10T08:00:00Z', 'expiry_5d')).toBe(
      'reminder-sub-1-2026-11-10-expiry_5d',
    );
    expect(reminderIdempotencyKey('sub-1', '2026-11-11T08:00:00Z', 'expiry_5d')).not.toBe(
      reminderIdempotencyKey('sub-1', '2026-11-10T08:00:00Z', 'expiry_5d'),
    );
  });
});

describe('normalizeStripeSubscriptionStatus', () => {
  it('maps Stripe spellings to app statuses', () => {
    expect(normalizeStripeSubscriptionStatus('canceled')).toBe('cancelled');
    expect(normalizeStripeSubscriptionStatus('trialing')).toBe('active');
    expect(normalizeStripeSubscriptionStatus('incomplete_expired')).toBe('expired');
    expect(normalizeStripeSubscriptionStatus('unpaid')).toBe('expired');
    expect(normalizeStripeSubscriptionStatus('past_due')).toBe('past_due');
    expect(normalizeStripeSubscriptionStatus('paused')).toBe('paused');
  });
});
