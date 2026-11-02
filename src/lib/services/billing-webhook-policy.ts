/**
 * Pure billing-webhook policy helpers (2026-11-02, credit + Stripe fix batch).
 *
 * No imports, no I/O: every rule here is unit-tested. The webhook and
 * status routes call these and keep all Stripe/DB access in the routes and
 * services, so a policy change never needs a live Stripe call to verify.
 *
 * Key product rules (both models are supported):
 * - One-time packs: a single payment for N credits, priced from the monthly
 *   table, never via a configured Price ID (price_data always, so the
 *   charged amount is exactly the table amount).
 * - Subscriptions: recurring plans. The first payment is credited at
 *   checkout.session.completed; renewals are credited only on
 *   invoice.payment_succeeded with billing_reason === 'subscription_cycle'
 *   (subscription_create is the already-credited first payment, and
 *   subscription_update/manual invoices are prorations, not new grants).
 * - Legacy checkout sessions (created before purchaseType metadata existed)
 *   were all subscriptions, so an absent purchaseType defaults to
 *   'subscription'.
 * - Webhook errors: permanent validation failures are prefixed
 *   WEBHOOK_VALIDATION and map to HTTP 400 (Stripe must not retry junk);
 *   everything else (DB outages, Stripe fetch failures, RPC failures) maps
 *   to HTTP 5xx so Stripe retries.
 */

export type PurchaseType = 'one_time' | 'subscription';

export function normalizePurchaseType(value: unknown): PurchaseType {
  return value === 'one_time' ? 'one_time' : 'subscription';
}

/** True only for genuine renewal cycles that earn a fresh credit grant. */
export function isRenewalGrantable(invoice: { billing_reason?: unknown; subscription?: unknown }): boolean {
  if (!invoice.subscription) return false;
  return String(invoice.billing_reason || '') === 'subscription_cycle';
}

/**
 * Pro-rated refund credit count: the refunded fraction of the charge maps
 * to the same fraction of the originally granted credits, floored. A full
 * refund reverses the full grant; a partial refund reverses only its share.
 */
export function computeRefundCredits(args: {
  chargeAmountCents: number;
  refundedAmountCents: number;
  grantedCredits: number;
}): number {
  if (args.chargeAmountCents <= 0 || args.refundedAmountCents <= 0 || args.grantedCredits <= 0) return 0;
  const fraction = Math.min(1, args.refundedAmountCents / args.chargeAmountCents);
  return Math.floor(args.grantedCredits * fraction);
}

export function renewalIdempotencyKey(invoiceId: string): string {
  return `stripe-renewal-${invoiceId}`;
}

export function refundIdempotencyKey(refundId: string): string {
  return `stripe-refund-${refundId}`;
}

/**
 * The amount a payment must match. One-time purchases never use Price IDs,
 * so their expected amount is always the one-time table amount. A
 * subscription created from a configured Price ID was charged Stripe's
 * Price amount, not the table amount — comparing against the table would
 * reject a legitimate payment, so the Price amount wins when present.
 */
export function resolveExpectedAmountCents(args: {
  purchaseType: PurchaseType;
  tableAmountCents: number;
  oneTimeAmountCents: number;
  priceUnitAmountCents?: number | null;
}): number {
  if (args.purchaseType === 'one_time') return args.oneTimeAmountCents;
  if (args.priceUnitAmountCents !== undefined && args.priceUnitAmountCents !== null) {
    return args.priceUnitAmountCents;
  }
  return args.tableAmountCents;
}

/** Permanent validation failures (HTTP 400); anything else is retryable (HTTP 5xx). */
export function isWebhookValidationError(error: unknown): boolean {
  return String((error as Error)?.message || '').startsWith('WEBHOOK_VALIDATION');
}

export function webhookValidationError(detail: string): Error {
  return new Error(`WEBHOOK_VALIDATION: ${detail}`);
}
