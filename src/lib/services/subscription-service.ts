/**
 * Server-only subscription store (2026-11-02, admin subscription batch).
 *
 * Stripe is the authority; this table is its synced copy. Webhooks write it
 * (checkout / renewal / update / delete); the admin pages and the reminder
 * cron read it. Every function degrades gracefully while the migration is
 * unapplied: a missing table logs once and behaves as "no subscriptions",
 * so sending is never blocked and webhooks never 500-loop on it. Only
 * genuine failures (non-missing-table errors on writes) throw, so Stripe
 * retries them.
 */

import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import {
  isSubscriptionExpired,
  normalizeStripeSubscriptionStatus,
  reminderIdempotencyKey,
  type SubscriptionStatus,
} from './subscription-policy';

export type UserSubscription = {
  id: string;
  userEmail: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  planName: string | null;
  creditsPerPeriod: number | null;
  amountCents: number | null;
  period: string | null;
  status: SubscriptionStatus;
  purchaseType: string | null;
  adminAssignedBy: string | null;
  adminNote: string | null;
  purchaseDate: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  lastRenewalAt: string | null;
  renewalCount: number;
  cancelAtPeriodEnd: boolean;
  createdAt: string | null;
};

export type SubscriptionReminder = {
  id: string;
  subscriptionId: string;
  periodEnd: string;
  reminderType: string;
  daysLeft: number | null;
  channel: string;
  sentAt: string;
};

function rowToSubscription(row: any): UserSubscription {
  return {
    id: row.id,
    userEmail: row.user_email,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeCustomerId: row.stripe_customer_id,
    planName: row.plan_name,
    creditsPerPeriod: row.credits_per_period,
    amountCents: row.amount_cents,
    period: row.period,
    status: row.status,
    purchaseType: row.purchase_type ?? null,
    adminAssignedBy: row.admin_assigned_by ?? null,
    adminNote: row.admin_note ?? null,
    purchaseDate: row.purchase_date,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    lastRenewalAt: row.last_renewal_at,
    renewalCount: Number(row.renewal_count) || 0,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    createdAt: row.created_at,
  };
}

/** True when the error is just "table does not exist yet" (migration unapplied). */
function isMissingTableError(error: any): boolean {
  // PostgREST reports a missing table with code PGRST205 and the message
  // "Could not find the table 'public.<table>' in the schema cache" —
  // NOT "does not exist". The old matcher only recognised the latter
  // phrasing, so the live message slipped through and threw (campaign
  // 2-1, 2026-11-02: all 5 leads FAILED before discovery). Match the code
  // first, then the real message phrasings.
  const code = (error as any)?.code;
  if (code === 'PGRST205' || code === '42P01') return true;
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('user_subscriptions') && /does not exist|could not find the table|schema cache/i.test(message);
}

function warnMissingTable(operation: string, error: any): void {
  console.warn(`[subscriptions] ${operation} skipped: table missing (migration not applied).`, {
    error: error instanceof Error ? error.message : String(error),
  });
}

function unixToIso(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}

/** Latest subscription row for a user (active/past_due preferred, else newest). */
export async function getSubscriptionForUser(userEmail: string): Promise<UserSubscription | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail.toLowerCase().trim())
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? rowToSubscription(data[0]) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('read', error);
      return null;
    }
    throw error;
  }
}

/** All rows for a user, newest period end first. */
export async function listSubscriptionsForUser(userEmail: string): Promise<UserSubscription[]> {
  const client = getSupabaseAdminClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail.toLowerCase().trim())
      .order('current_period_end', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data || []).map(rowToSubscription);
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('read', error);
      return [];
    }
    throw error;
  }
}

/**
 * Sending gate for one user: blocked only when an expired row exists and
 * no active/past_due row exists. Missing table or no rows never block.
 */
export async function getSendingAccess(userEmail: string): Promise<{ blocked: boolean; reason?: string }> {
  const rows = await listSubscriptionsForUser(userEmail);
  if (rows.length === 0) return { blocked: false };
  const now = Date.now();
  const hasActive = rows.some((r) => r.status === 'active' || r.status === 'past_due' || r.status === 'lifetime');
  const hasExpired = rows.some((r) =>
    isSubscriptionExpired(
      { id: r.id, status: r.status, current_period_end: r.currentPeriodEnd, cancel_at_period_end: r.cancelAtPeriodEnd },
      now,
    ),
  );
  if (hasExpired && !hasActive) {
    return {
      blocked: true,
      reason: 'Your subscription has expired. Please renew your plan to continue sending.',
    };
  }
  return { blocked: false };
}

/** Upsert from a Stripe subscription object (checkout / update events). */
export async function upsertSubscriptionFromStripe(input: {
  stripeSubscription: any;
  userEmail: string;
  planName?: string | null;
  creditsPerPeriod?: number | null;
  amountCents?: number | null;
  period?: string | null;
  purchaseDate?: string | null;
}): Promise<UserSubscription | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  const sub = input.stripeSubscription;
  if (!sub?.id) return null;
  const row = {
    user_email: input.userEmail.toLowerCase().trim(),
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : null,
    plan_name: input.planName ?? null,
    credits_per_period: input.creditsPerPeriod ?? null,
    amount_cents: input.amountCents ?? null,
    period: input.period ?? null,
    status: normalizeStripeSubscriptionStatus(sub.status),
    purchase_date: input.purchaseDate ?? null,
    current_period_start: unixToIso(sub.current_period_start),
    current_period_end: unixToIso(sub.current_period_end),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  };
  try {
    const { data, error } = await client
      .from('user_subscriptions')
      .upsert(row, { onConflict: 'stripe_subscription_id' })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? rowToSubscription(data) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('upsert', error);
      return null;
    }
    throw error;
  }
}

/** Renewal sync: new period end + renewal counters (invoice.payment_succeeded, cycle). */
export async function recordRenewal(input: {
  stripeSubscriptionId: string;
  periodEndIso: string | null;
}): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;
  try {
    const { data, error } = await client
      .from('user_subscriptions')
      .select('id, renewal_count')
      .eq('stripe_subscription_id', input.stripeSubscriptionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // Legacy subscriber with no row (pre-table purchase): nothing to
      // update. Backfill, not silent creation from an invoice alone.
      console.warn('[subscriptions] renewal for unknown subscription; backfill needed.', {
        stripeSubscriptionId: input.stripeSubscriptionId,
      });
      return;
    }
    const { error: updateError } = await client
      .from('user_subscriptions')
      .update({
        current_period_end: input.periodEndIso,
        last_renewal_at: new Date().toISOString(),
        renewal_count: (Number(data.renewal_count) || 0) + 1,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
    if (updateError) throw updateError;
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('renewal', error);
      return;
    }
    throw error;
  }
}

/** Status sync for customer.subscription.updated / deleted events. */
export async function syncSubscriptionStatus(stripeSubscription: any): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client || !stripeSubscription?.id) return;
  try {
    const { error } = await client
      .from('user_subscriptions')
      .update({
        status: normalizeStripeSubscriptionStatus(stripeSubscription.status),
        current_period_start: unixToIso(stripeSubscription.current_period_start),
        current_period_end: unixToIso(stripeSubscription.current_period_end),
        cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', stripeSubscription.id);
    if (error) throw error;
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('status sync', error);
      return;
    }
    throw error;
  }
}

/** Active subscriptions whose period ends within the next `days` days. */
export async function getExpiringSubscriptions(days: number): Promise<UserSubscription[]> {
  const client = getSupabaseAdminClient();
  if (!client) return [];
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 86_400_000);
  try {
    const { data, error } = await client
      .from('user_subscriptions')
      .select('*')
      .in('status', ['active', 'past_due'])
      .gt('current_period_end', now.toISOString())
      .lte('current_period_end', horizon.toISOString())
      .order('current_period_end', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToSubscription);
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('expiring query', error);
      return [];
    }
    throw error;
  }
}

/** All rows for the admin list, with optional status / expiring filters. */
export async function listAllSubscriptions(input?: {
  status?: string;
  expiringWithinDays?: number;
}): Promise<UserSubscription[]> {
  const client = getSupabaseAdminClient();
  if (!client) return [];
  try {
    let query = client.from('user_subscriptions').select('*');
    if (input?.status && input.status !== 'all') query = query.eq('status', input.status);
    if (input?.expiringWithinDays) {
      const now = new Date();
      const horizon = new Date(now.getTime() + input.expiringWithinDays * 86_400_000);
      query = query
        .in('status', ['active', 'past_due'])
        .gt('current_period_end', now.toISOString())
        .lte('current_period_end', horizon.toISOString());
    }
    const { data, error } = await query.order('current_period_end', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data || []).map(rowToSubscription);
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('admin list', error);
      return [];
    }
    throw error;
  }
}

/** Reminder rows for one subscription, newest first. */
export async function listRemindersForSubscription(subscriptionId: string): Promise<SubscriptionReminder[]> {
  const client = getSupabaseAdminClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('subscription_reminders')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('sent_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      subscriptionId: row.subscription_id,
      periodEnd: row.period_end,
      reminderType: row.reminder_type,
      daysLeft: row.days_left,
      channel: row.channel,
      sentAt: row.sent_at,
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('reminder list', error);
      return [];
    }
    throw error;
  }
}

/** True when this exact reminder was already recorded (the dedupe). */
export async function hasReminderBeenSent(idempotencyKey: string): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('subscription_reminders')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('reminder check', error);
      return false;
    }
    throw error;
  }
}

/**
 * Records a sent reminder. Returns false when the key already existed
 * (a concurrent run won the race) — callers must treat false as "do not
 * send again". Throws on genuine failures; missing table returns false
 * (the cron then skips recording but must NOT send blindly every day —
 * see the cron route, which treats a missing table as a full skip).
 */
export async function recordReminder(input: {
  subscriptionId: string;
  periodEnd: string;
  reminderType?: string;
  daysLeft?: number | null;
  channel?: string;
}): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) return false;
  const key = reminderIdempotencyKey(
    input.subscriptionId,
    input.periodEnd,
    input.reminderType || 'expiry_5d',
  );
  try {
    const { error } = await client.from('subscription_reminders').insert({
      subscription_id: input.subscriptionId,
      period_end: input.periodEnd,
      reminder_type: input.reminderType || 'expiry_5d',
      days_left: input.daysLeft ?? null,
      channel: input.channel || 'email',
      idempotency_key: key,
    });
    if (error) {
      // Unique violation = another run already recorded it.
      if (String((error as any).code) === '23505' || String(error.message || '').includes('duplicate key')) return false;
      throw error;
    }
    return true;
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('reminder record', error);
      return false;
    }
    throw error;
  }
}

/** Renewal reminders default ON; a row only exists when a user opts out. */
export async function getRenewalPreference(userEmail: string): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) return true;
  try {
    const { data, error } = await client
      .from('notification_preferences')
      .select('renewal_reminders')
      .eq('user_email', userEmail.toLowerCase().trim())
      .maybeSingle();
    if (error) throw error;
    return data ? Boolean(data.renewal_reminders) : true;
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTable('preference read', error);
      return true;
    }
    throw error;
  }
}

/** True when the subscription tables exist (used by the cron to fail safe). */
export async function subscriptionsTablesAvailable(): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) return false;
  try {
    const { error } = await client.from('user_subscriptions').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
