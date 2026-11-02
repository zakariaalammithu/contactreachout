/**
 * Admin user management service (2026-11-02, URGENT admin brief).
 * Server-only. Implements the real workflows behind the Users page
 * actions menu: package change, subscription dates, history.
 *
 * Honesty rules (brief §5–§6):
 * - Package/date changes REQUIRE the subscription tables (migrations
 *   20261102000002 + 20261102000003). While unapplied they fail closed
 *   with tablesAvailable=false — never a fabricated success.
 * - Manual assignments are purchase_type 'manual' / 'lifetime_admin'
 *   with amount_cents NULL: they are NEVER shown as Stripe payments.
 * - History is append-only: adjustments add rows, never edit old ones.
 * - Package/date actions are idempotent on requestId via the durable
 *   admin-action log (a replay returns the current state).
 * - Credit add/deduct live in the wallet services (addBonusCredits /
 *   deductAdminCredits); this file only resolves the target + role
 *   guards shared by the management routes.
 */

import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { AuthStore } from '@/lib/auth/auth-store';
import { CreditWalletServerService as CreditWalletService } from './credit-wallet-server-service';
import { CreditWalletService as InMemoryWallet } from './credit-wallet-service';
import { AuditLogService } from './audit-log-service';
import { PaymentStore } from './payment-store';
import { listDurablePayments } from './stripe-payment-record';
import {
  getSubscriptionForUser,
  listSubscriptionsForUser,
  subscriptionsTablesAvailable,
  type UserSubscription,
} from './subscription-service';
import { hasAdminAction, listAdminActionsForUser, recordAdminAction } from './admin-action-service';
import {
  PLAN_CREDITS_MONTHLY,
  PLAN_CREDITS_YEARLY,
  creditsForPackage,
  deriveSubscriptionDates,
  validatePackageChange,
} from './admin-management-policy';

export type ManagementError = {
  status: number;
  error: string;
  tablesAvailable?: boolean;
};

export type ResolvedTarget = {
  email: string;
  authUser: ReturnType<typeof AuthStore.getUserByEmail> | null;
  isSuperAdmin: boolean;
};

/** Target resolution: AuthStore first, durable users table second. */
export async function resolveManagementTarget(email: string): Promise<ResolvedTarget | null> {
  const normalized = email.toLowerCase().trim();
  const authUser = AuthStore.getUserByEmail(normalized) || null;
  if (authUser) return { email: authUser.email, authUser, isSuperAdmin: authUser.role === 'SUPER_ADMIN' };
  const client = getSupabaseAdminClient();
  if (client) {
    const { data } = await client.from('users').select('email, role').eq('email', normalized).maybeSingle();
    if (data?.email) {
      return { email: data.email, authUser: null, isSuperAdmin: (data as any).role === 'SUPER_ADMIN' };
    }
  }
  return null;
}

/** ADMIN callers cannot touch SUPER_ADMIN targets (mirrors users PATCH). */
export function targetGuard(actorRole: string, target: ResolvedTarget): ManagementError | null {
  if (actorRole === 'ADMIN' && target.isSuperAdmin) {
    return { status: 403, error: 'Admins cannot modify Super Admin accounts.' };
  }
  return null;
}

function isMissingTableError(error: any): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('user_subscriptions') && /does not exist|42P01|PGRST205/.test(message);
}

function periodEndFor(period: string, nowMs: number): string | null {
  if (period === 'monthly') return new Date(nowMs + 30 * 86400000).toISOString();
  if (period === 'yearly') return new Date(nowMs + 365 * 86400000).toISOString();
  return null; // Free marker + lifetime: no expiry
}

function rowCreditsFor(plan: string, period: string | null): number {
  if (plan === 'Free') return 100;
  if (period === 'yearly') return (PLAN_CREDITS_YEARLY as any)[plan] ?? 0;
  return (PLAN_CREDITS_MONTHLY as any)[plan] ?? 0;
}

/**
 * Change a user's package. Writes a new manual subscription row, cancels
 * superseded active rows, grants period credits for paid monthly/yearly
 * plans (BONUS bucket, manual — never a Stripe payment), updates the
 * AuthStore plan label, and audits the action.
 */
export async function applyPackageChange(input: {
  actorEmail: string;
  actorRole: string;
  targetEmail: string;
  plan: string;
  period: string | null;
  reason: string;
  requestId: string;
}): Promise<
  | { ok: true; replayed: boolean; subscription: UserSubscription | null; creditsGranted: number; auditStored: boolean }
  | { ok: false; error: ManagementError }
> {
  const validation = validatePackageChange(input.plan, input.period || (input.plan === 'Free' ? 'monthly' : ''));
  if (validation) return { ok: false, error: { status: 400, error: validation } };
  const period = input.plan === 'Free' ? null : (input.period as string);

  const target = await resolveManagementTarget(input.targetEmail);
  if (!target) return { ok: false, error: { status: 404, error: 'Target user was not found.' } };
  const guard = targetGuard(input.actorRole, target);
  if (guard) return { ok: false, error: guard };

  if (await hasAdminAction(input.requestId, 'package_changed')) {
    const current = await getSubscriptionForUser(target.email);
    return { ok: true, replayed: true, subscription: current, creditsGranted: 0, auditStored: true };
  }

  if (!(await subscriptionsTablesAvailable())) {
    return {
      ok: false,
      error: {
        status: 503,
        error: 'Subscription tables are not available yet (migrations 20261102000002 + 20261102000003 are not applied). Package change was NOT applied.',
        tablesAvailable: false,
      },
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return { ok: false, error: { status: 503, error: 'Database is not configured.', tablesAvailable: false } };
  }

  const now = new Date();
  const nowMs = now.getTime();
  const status = period === 'lifetime' ? 'lifetime' : 'active';
  const purchaseType = period === 'lifetime' ? 'lifetime_admin' : 'manual';
  const credits = creditsForPackage(input.plan, period);
  const previous = await getSubscriptionForUser(target.email);

  let newRowId: string | null = null;
  try {
    const { data, error } = await client
      .from('user_subscriptions')
      .insert({
        user_email: target.email,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        plan_name: input.plan,
        credits_per_period: rowCreditsFor(input.plan, period),
        amount_cents: null,
        period,
        status,
        purchase_type: purchaseType,
        purchase_date: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEndFor(period || '', nowMs),
        renewal_count: 0,
        cancel_at_period_end: false,
        admin_assigned_by: input.actorEmail,
        admin_note: input.reason,
        last_admin_action_at: now.toISOString(),
      })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Package row insert returned nothing.');
    newRowId = data.id;

    // Cancel superseded active/past_due rows (never the new row).
    const prior = await listSubscriptionsForUser(target.email);
    for (const row of prior) {
      if (row.id === newRowId) continue;
      if (row.status !== 'active' && row.status !== 'past_due') continue;
      await client
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          admin_note: `Superseded by admin package change to ${input.plan}${period ? ` (${period})` : ''}.`,
          last_admin_action_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', row.id);
    }

    // Period credits for paid monthly/yearly plans only (Free and
    // lifetime grant nothing automatically — credits are managed
    // explicitly via Manage Credits).
    if (credits > 0) {
      await CreditWalletService.addBonusCreditsForServer(
        credits,
        `Admin package assignment: ${input.plan} ${period} (manual, not a Stripe payment)`,
        target.email,
        `admin-package-${input.requestId}`,
      );
    }
  } catch (error) {
    // Roll back the new row so a failed grant never leaves a half-applied
    // package change behind.
    if (newRowId) {
      try {
        await client.from('user_subscriptions').delete().eq('id', newRowId);
      } catch {
        // Rollback is best-effort; the original error below is the one reported.
      }
    }
    if (isMissingTableError(error)) {
      return {
        ok: false,
        error: {
          status: 503,
          error: 'Subscription tables are not available yet (migrations not applied). Package change was NOT applied.',
          tablesAvailable: false,
        },
      };
    }
    throw error;
  }

  if (target.authUser) {
    AuthStore.updateUser(target.email, { plan: input.plan });
  }

  const { stored } = await recordAdminAction({
    actorEmail: input.actorEmail,
    action: 'package_changed',
    targetEmail: target.email,
    reason: input.reason,
    requestId: input.requestId,
    details: {
      plan: input.plan,
      period,
      creditsGranted: credits,
      previousPlan: previous?.planName || null,
      previousStatus: previous?.status || null,
    },
  });

  const subscription = await getSubscriptionForUser(target.email);
  return { ok: true, replayed: false, subscription, creditsGranted: credits, auditStored: stored };
}

/**
 * Subscription-date action: extend (7/15/30/custom days), set explicit
 * dates, expire now, or reactivate. Lifetime rows reject every action.
 */
export async function applySubscriptionDates(input: {
  actorEmail: string;
  actorRole: string;
  targetEmail: string;
  action: 'extend' | 'set' | 'expire' | 'reactivate';
  extendDays?: number;
  startDate?: string;
  endDate?: string;
  reason: string;
  requestId: string;
}): Promise<
  | { ok: true; replayed: boolean; subscription: UserSubscription | null; auditStored: boolean }
  | { ok: false; error: ManagementError }
> {
  const target = await resolveManagementTarget(input.targetEmail);
  if (!target) return { ok: false, error: { status: 404, error: 'Target user was not found.' } };
  const guard = targetGuard(input.actorRole, target);
  if (guard) return { ok: false, error: guard };

  if (await hasAdminAction(input.requestId, 'subscription_dates_changed')) {
    const current = await getSubscriptionForUser(target.email);
    return { ok: true, replayed: true, subscription: current, auditStored: true };
  }

  if (!(await subscriptionsTablesAvailable())) {
    return {
      ok: false,
      error: {
        status: 503,
        error: 'Subscription tables are not available yet (migrations 20261102000002 + 20261102000003 are not applied). Date change was NOT applied.',
        tablesAvailable: false,
      },
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return { ok: false, error: { status: 503, error: 'Database is not configured.', tablesAvailable: false } };
  }

  const row = await getSubscriptionForUser(target.email);
  let derived: { status: string; current_period_end: string; current_period_start?: string };
  try {
    derived = deriveSubscriptionDates(
      row ? { status: row.status, period: row.period, current_period_end: row.currentPeriodEnd } : null,
      input.action,
      { extendDays: input.extendDays, startDate: input.startDate, endDate: input.endDate },
      Date.now(),
    );
  } catch (error) {
    return { ok: false, error: { status: 400, error: error instanceof Error ? error.message : 'Invalid date change.' } };
  }

  if (!row) return { ok: false, error: { status: 404, error: 'No subscription found for this user. Assign a package first.' } };

  try {
    const { error } = await client
      .from('user_subscriptions')
      .update({
        status: derived.status,
        ...(derived.current_period_start ? { current_period_start: derived.current_period_start } : {}),
        current_period_end: derived.current_period_end,
        admin_note: input.reason,
        last_admin_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (error) throw error;
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        ok: false,
        error: {
          status: 503,
          error: 'Subscription tables are not available yet (migrations not applied). Date change was NOT applied.',
          tablesAvailable: false,
        },
      };
    }
    throw error;
  }

  const { stored } = await recordAdminAction({
    actorEmail: input.actorEmail,
    action: 'subscription_dates_changed',
    targetEmail: target.email,
    reason: input.reason,
    requestId: input.requestId,
    details: {
      dateAction: input.action,
      extendDays: input.extendDays || null,
      previousEnd: row.currentPeriodEnd,
      newEnd: derived.current_period_end,
      newStatus: derived.status,
    },
  });

  const subscription = await getSubscriptionForUser(target.email);
  return { ok: true, replayed: false, subscription, auditStored: stored };
}

/** Per-user history for the Users page history modal (matches only). */
export async function getUserManagementHistory(targetEmail: string): Promise<{
  subscriptions: UserSubscription[];
  payments: Array<Record<string, any>>;
  creditTransactions: Array<Record<string, any>>;
  adminActions: Array<Record<string, any>>;
}> {
  const email = targetEmail.toLowerCase().trim();
  const subscriptions = await listSubscriptionsForUser(email);

  const durable = await listDurablePayments();
  const memoryPayments = PaymentStore.list();
  const payments = [
    ...(durable || []).filter((p: any) => p.userId === email),
    ...memoryPayments.filter((p: any) => (p as any).userEmail === email || (p as any).userId === email),
  ].map((p: any) => ({
    id: p.sessionId || p.id,
    credits: p.credits,
    amountCents: p.amountCents,
    status: p.status,
    purchaseType: p.purchaseType,
    createdAt: p.createdAt,
    source: durable && durable.includes(p) ? 'stripe_durable' : 'memory',
  }));

  let creditTransactions: Array<Record<string, any>> = [];
  try {
    creditTransactions = await CreditWalletService.getTransactionsForServer(email);
  } catch (error) {
    // Unprovisioned account on the DB path: fall back to the in-memory
    // ledger keyed by email (the same store the admin grant flows use).
    if (error instanceof Error && /CREDIT_DATABASE_USER_NOT_FOUND|CREDIT_DATABASE_NOT_CONFIGURED/.test(error.message)) {
      creditTransactions = InMemoryWallet.getTransactions(email);
    } else {
      throw error;
    }
  }

  const durableActions = await listAdminActionsForUser(email);
  // Session trail: the same actions also land in the in-memory audit
  // log (visible on /admin/logs). Show them here too so the Activity
  // tab is useful before migration 20261102000003 is applied — deduped
  // against durable rows on (action, actor, reason) within 5 seconds,
  // so a post-migration action never appears twice.
  const sessionActions = AuditLogService.query({ resourceType: 'user', limit: 100 }).logs
    .filter((l: any) => l.metadata?.targetEmail === email)
    .map((l: any) => ({
      id: l.id,
      actorEmail: l.userEmail,
      action: l.action,
      reason: l.metadata?.reason || '',
      details: l.metadata || {},
      createdAt: l.timestamp,
      source: 'session' as const,
    }));
  const adminActions = [
    ...durableActions.map((a) => ({ ...a, source: 'durable' as const })),
    ...sessionActions.filter((s) => !durableActions.some((d) =>
      d.action === s.action &&
      d.actorEmail === s.actorEmail &&
      d.reason === s.reason &&
      Math.abs(new Date(d.createdAt).getTime() - new Date(s.createdAt).getTime()) <= 5000,
    )),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);

  return { subscriptions, payments, creditTransactions, adminActions };
}
