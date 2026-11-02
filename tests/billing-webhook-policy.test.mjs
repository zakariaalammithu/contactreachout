import { describe, expect, it } from 'vitest';
import {
  normalizePurchaseType,
  isRenewalGrantable,
  computeRefundCredits,
  renewalIdempotencyKey,
  refundIdempotencyKey,
  resolveExpectedAmountCents,
  isWebhookValidationError,
  webhookValidationError,
} from '@/lib/services/billing-webhook-policy';

describe('normalizePurchaseType', () => {
  it('keeps one_time and subscription, and defaults legacy (absent/garbage) metadata to subscription', () => {
    expect(normalizePurchaseType('one_time')).toBe('one_time');
    expect(normalizePurchaseType('subscription')).toBe('subscription');
    expect(normalizePurchaseType(undefined)).toBe('subscription');
    expect(normalizePurchaseType(null)).toBe('subscription');
    expect(normalizePurchaseType('bogus')).toBe('subscription');
  });
});

describe('isRenewalGrantable', () => {
  it('grants only subscription_cycle invoices tied to a subscription', () => {
    expect(isRenewalGrantable({ billing_reason: 'subscription_cycle', subscription: 'sub_1' })).toBe(true);
  });

  it('skips the first payment (already credited at checkout), updates, manual invoices, and subscription-less invoices', () => {
    expect(isRenewalGrantable({ billing_reason: 'subscription_create', subscription: 'sub_1' })).toBe(false);
    expect(isRenewalGrantable({ billing_reason: 'subscription_update', subscription: 'sub_1' })).toBe(false);
    expect(isRenewalGrantable({ billing_reason: 'manual', subscription: 'sub_1' })).toBe(false);
    expect(isRenewalGrantable({ billing_reason: 'subscription_cycle' })).toBe(false);
    expect(isRenewalGrantable({})).toBe(false);
  });
});

describe('computeRefundCredits', () => {
  it('reverses the full grant on a full refund and pro-rates partial refunds (floored)', () => {
    expect(computeRefundCredits({ chargeAmountCents: 5000, refundedAmountCents: 5000, grantedCredits: 5000 })).toBe(5000);
    expect(computeRefundCredits({ chargeAmountCents: 5000, refundedAmountCents: 2500, grantedCredits: 5000 })).toBe(2500);
    expect(computeRefundCredits({ chargeAmountCents: 3000, refundedAmountCents: 1000, grantedCredits: 1000 })).toBe(333);
  });

  it('caps at the grant and returns 0 for degenerate inputs', () => {
    expect(computeRefundCredits({ chargeAmountCents: 5000, refundedAmountCents: 9000, grantedCredits: 5000 })).toBe(5000);
    expect(computeRefundCredits({ chargeAmountCents: 0, refundedAmountCents: 100, grantedCredits: 5000 })).toBe(0);
    expect(computeRefundCredits({ chargeAmountCents: 5000, refundedAmountCents: 0, grantedCredits: 5000 })).toBe(0);
    expect(computeRefundCredits({ chargeAmountCents: 5000, refundedAmountCents: 100, grantedCredits: 0 })).toBe(0);
  });
});

describe('idempotency keys', () => {
  it('namespaces renewals and refunds separately so neither can collide with purchases', () => {
    expect(renewalIdempotencyKey('in_1')).toBe('stripe-renewal-in_1');
    expect(refundIdempotencyKey('re_1')).toBe('stripe-refund-re_1');
    expect(renewalIdempotencyKey('in_1')).not.toBe(refundIdempotencyKey('in_1'));
  });
});

describe('resolveExpectedAmountCents', () => {
  it('uses the one-time amount for one-time purchases even when a Price exists', () => {
    expect(
      resolveExpectedAmountCents({ purchaseType: 'one_time', tableAmountCents: 4000, oneTimeAmountCents: 4000, priceUnitAmountCents: 9999 }),
    ).toBe(4000);
  });

  it('prefers the Stripe Price amount for subscriptions created from a Price, else the table amount', () => {
    expect(
      resolveExpectedAmountCents({ purchaseType: 'subscription', tableAmountCents: 4000, oneTimeAmountCents: 4000, priceUnitAmountCents: 4500 }),
    ).toBe(4500);
    expect(
      resolveExpectedAmountCents({ purchaseType: 'subscription', tableAmountCents: 4000, oneTimeAmountCents: 4000, priceUnitAmountCents: null }),
    ).toBe(4000);
    expect(
      resolveExpectedAmountCents({ purchaseType: 'subscription', tableAmountCents: 4000, oneTimeAmountCents: 4000 }),
    ).toBe(4000);
  });
});

describe('webhook error classification', () => {
  it('treats only WEBHOOK_VALIDATION errors as permanent (400); everything else retries (5xx)', () => {
    expect(isWebhookValidationError(webhookValidationError('amount mismatch'))).toBe(true);
    expect(isWebhookValidationError(new Error('CREDIT_DATABASE_TRANSACTION_FAILED: boom'))).toBe(false);
    expect(isWebhookValidationError(new Error('fetch failed'))).toBe(false);
    expect(isWebhookValidationError(null)).toBe(false);
  });
});
