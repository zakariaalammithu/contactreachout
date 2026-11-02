/**
 * Pure subscription-expiry policy (2026-11-02, admin subscription batch).
 * No imports: unit-testable without a database or Stripe.
 *
 * Product rule (owner decision 2026-11-02): when a paid subscription
 * expires, features stop. Gating applies ONLY to users who had a paid
 * subscription that expired with no active subscription left:
 *  - Free users (never subscribed) keep their Free allowance.
 *  - One-time pack buyers have no subscription row, so they are unaffected
 *    (their credits never expire).
 *  - past_due keeps access (Stripe is still retrying; it is not expired).
 *  - cancelled at period end keeps access until the period actually ends.
 *  - cancelled immediately, or expired, blocks immediately.
 */

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired' | 'paused' | 'incomplete' | 'lifetime';

/**
 * Stripe subscription statuses → app statuses. Stripe spells it
 * "canceled" (one L); trialing counts as active (access already granted);
 * incomplete_expired / unpaid mean the subscription is dead.
 */
export function normalizeStripeSubscriptionStatus(status: string | null | undefined): SubscriptionStatus {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete_expired':
    case 'unpaid':
      return 'expired';
    case 'paused':
      return 'paused';
    case 'incomplete':
      return 'incomplete';
    default:
      return 'active';
  }
}

export type SubscriptionRowShape = {
  id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function isSubscriptionExpired(
  sub: SubscriptionRowShape,
  nowMs: number = Date.now(),
): boolean {
  // Lifetime never expires: no period end, no reminders, no gating.
  if (sub.status === 'lifetime') return false;
  if (sub.status === 'expired') return true;
  if (sub.status === 'cancelled') {
    // Immediate cancellation blocks now; at-period-end cancellation blocks
    // only once the paid period has actually run out.
    if (!sub.cancel_at_period_end) return true;
    if (!sub.current_period_end) return true;
    return new Date(sub.current_period_end).getTime() <= nowMs;
  }
  return false;
}

/** Whole days left until period end; 0 once the end has passed. */
export function getDaysRemaining(periodEnd: string | null, nowMs: number = Date.now()): number | null {
  if (!periodEnd) return null;
  const diffMs = new Date(periodEnd).getTime() - nowMs;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 86_400_000);
}

/** True when period end falls inside (now, now + days]. */
export function isExpiringWithin(
  periodEnd: string | null,
  days: number,
  nowMs: number = Date.now(),
): boolean {
  if (!periodEnd) return false;
  const endMs = new Date(periodEnd).getTime();
  return endMs > nowMs && endMs <= nowMs + days * 86_400_000;
}

/** Sending gate: blocked only when an expired row exists and no active row does. */
export function decideSendingAccess(input: {
  hasActiveSubscription: boolean;
  hasExpiredSubscription: boolean;
}): { blocked: boolean; reason?: string } {
  if (input.hasExpiredSubscription && !input.hasActiveSubscription) {
    return {
      blocked: true,
      reason: 'Your subscription has expired. Please renew your plan to continue sending.',
    };
  }
  return { blocked: false };
}

/** Idempotency key for one reminder: one row per (subscription x period end x type). */
export function reminderIdempotencyKey(
  subscriptionId: string,
  periodEnd: string,
  reminderType: string = 'expiry_5d',
): string {
  const day = new Date(periodEnd).toISOString().slice(0, 10);
  return `reminder-${subscriptionId}-${day}-${reminderType}`;
}
