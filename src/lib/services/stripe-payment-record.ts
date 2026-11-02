/**
 * Durable Stripe payment records (2026-11-02, credit + Stripe fix batch).
 *
 * PaymentStore is a module-level Map: on serverless it evaporates on cold
 * start, so admin revenue and payment history show only the current
 * instance's slice. This module writes the same facts to a `stripe_payments`
 * table (see supabase/migrations/20261102000001_create_stripe_payments.sql).
 *
 * Best-effort by design: until the migration is applied, every call fails
 * against the missing table, is caught, and only logs — crediting and
 * checkout never block on this record. Once applied, records persist and
 * listDurablePayments() returns them (null = table unavailable → callers
 * fall back to PaymentStore). Never throws.
 */

import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

export type DurablePaymentRecord = {
  sessionId: string;
  userId: string;
  credits: number;
  amountCents: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  credited: boolean;
  stripeCustomerId?: string;
  purchaseType?: 'one_time' | 'subscription';
  createdAt?: string;
};

export async function recordStripePayment(record: DurablePaymentRecord): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;
  try {
    const { error } = await client.from('stripe_payments').upsert(
      {
        session_id: record.sessionId,
        user_id: record.userId,
        credits: record.credits,
        amount_cents: record.amountCents,
        status: record.status,
        credited: record.credited,
        stripe_customer_id: record.stripeCustomerId || null,
        purchase_type: record.purchaseType || 'subscription',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' },
    );
    if (error) throw error;
  } catch (error) {
    // Table missing (migration not applied yet) or any other write failure:
    // log and continue. This record must never block a payment or a credit.
    console.warn('[stripe-payments] durable record failed:', {
      sessionId: record.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Durable payment history, newest first; null when the table is unavailable. */
export async function listDurablePayments(): Promise<DurablePaymentRecord[] | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('stripe_payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data || []).map((row: any) => ({
      sessionId: row.session_id,
      userId: row.user_id,
      credits: Number(row.credits) || 0,
      amountCents: Number(row.amount_cents) || 0,
      status: row.status,
      credited: Boolean(row.credited),
      stripeCustomerId: row.stripe_customer_id || undefined,
      purchaseType: row.purchase_type,
      createdAt: row.created_at,
    }));
  } catch {
    return null;
  }
}
