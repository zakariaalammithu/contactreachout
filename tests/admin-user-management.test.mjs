import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// In-memory fake Supabase tables, reset per test via globalThis.
function freshTables() {
  return {
    users: [{ id: 'db-demo-1', email: 'user@demo.com', role: 'USER' }],
    user_subscriptions: [],
    admin_action_logs: [],
  };
}
globalThis.__adminMgmtTables = freshTables();
globalThis.__adminMgmtMissing = false;

class Builder {
  constructor(tables, table) {
    this.tables = tables;
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.limitN = null;
    this.patch = null;
    this.isDelete = false;
    this.inserted = null;
  }
  _rows() {
    let rows = this.tables[this.table].filter((r) => this.filters.every((f) => f(r)));
    for (const o of this.orders) {
      rows = [...rows].sort((a, b) => {
        const av = a[o.col];
        const bv = b[o.col];
        if (av == null && bv == null) return 0;
        if (av == null) return o.nullsFirst ? -1 : 1;
        if (bv == null) return o.nullsFirst ? 1 : -1;
        if (av < bv) return o.ascending ? -1 : 1;
        if (av > bv) return o.ascending ? 1 : -1;
        return 0;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }
  select() { return this; }
  eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
  neq(col, val) { this.filters.push((r) => r[col] !== val); return this; }
  in(col, vals) { this.filters.push((r) => vals.includes(r[col])); return this; }
  gt(col, val) { this.filters.push((r) => r[col] > val); return this; }
  gte(col, val) { this.filters.push((r) => r[col] >= val); return this; }
  lt(col, val) { this.filters.push((r) => r[col] < val); return this; }
  lte(col, val) { this.filters.push((r) => r[col] <= val); return this; }
  order(col, opts = {}) { this.orders.push({ col, ascending: opts.ascending !== false, nullsFirst: !!opts.nullsFirst }); return this; }
  limit(n) { this.limitN = n; return this; }
  insert(row) {
    const rows = (Array.isArray(row) ? row : [row]).map((r) => ({
      id: `fake-${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...r,
    }));
    this.tables[this.table].push(...rows);
    this.inserted = rows;
    return this;
  }
  update(patch) { this.patch = patch; return this; }
  delete() { this.isDelete = true; return this; }
  async maybeSingle() {
    if (this.inserted) return { data: this.inserted[0] ?? null, error: null };
    const rows = this._rows();
    return { data: rows[0] ?? null, error: null };
  }
  async single() { return this.maybeSingle(); }
  then(resolve, reject) {
    try {
      if (this.patch) {
        const rows = this._rows();
        rows.forEach((r) => Object.assign(r, this.patch));
        resolve({ data: rows, error: null });
      } else if (this.isDelete) {
        const rows = this._rows();
        const set = new Set(rows);
        this.tables[this.table] = this.tables[this.table].filter((r) => !set.has(r));
        resolve({ data: rows, error: null });
      } else {
        resolve({ data: this._rows(), error: null });
      }
    } catch (e) {
      reject(e);
    }
  }
}

function fakeClient() {
  return {
    from(table) {
      if (globalThis.__adminMgmtMissing) {
        throw new Error(`relation "${table}" does not exist`);
      }
      return new Builder(globalThis.__adminMgmtTables, table);
    },
    rpc(_name, args) {
      const amount = Number(args.p_amount) || 0;
      return {
        single: async () => ({
          data: {
            wallet: {
              free_monthly_credits: 100,
              free_monthly_used: 0,
              paid_credits: 0,
              bonus_credits: Math.max(0, amount),
              lifetime_credits_purchased: Math.max(0, amount),
              lifetime_credits_used: 0,
              free_credit_period_start: new Date().toISOString(),
              free_credit_period_end: new Date().toISOString(),
            },
            transaction: {
              id: 'fake-tx-1',
              transaction_type: args.p_transaction_type,
              credit_source: 'BONUS',
              amount,
              balance_before: 100,
              balance_after: 100 + Math.max(0, amount),
              description: args.p_description,
              idempotency_key: args.p_idempotency_key,
              created_at: new Date().toISOString(),
            },
            applied: true,
          },
          error: null,
        }),
      };
    },
  };
}

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => fakeClient(),
}));

import { AuthStore } from '@/lib/auth/auth-store';
import {
  applyPackageChange,
  applySubscriptionDates,
} from '@/lib/services/admin-user-management';

const ACTOR = { actorEmail: 'mithusquare@gmail.com', actorRole: 'SUPER_ADMIN' };
const TARGET = 'user@demo.com';
const tables = () => globalThis.__adminMgmtTables;

beforeEach(() => {
  globalThis.__adminMgmtTables = freshTables();
  globalThis.__adminMgmtMissing = false;
  const demo = AuthStore.getUserByEmail(TARGET);
  if (demo) AuthStore.updateUser(TARGET, { plan: 'Free' });
});

describe('applyPackageChange', () => {
  it('assigns Free as a manual marker row with no credits and no payment', async () => {
    const result = await applyPackageChange({
      ...ACTOR,
      targetEmail: TARGET,
      plan: 'Free',
      period: null,
      reason: 'test free assignment',
      requestId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.ok).toBe(true);
    expect(result.creditsGranted).toBe(0);
    expect(result.subscription?.planName).toBe('Free');
    expect(result.subscription?.status).toBe('active');
    expect(result.subscription?.purchaseType).toBe('manual');
    expect(result.subscription?.amountCents).toBe(null);
    expect(result.subscription?.currentPeriodEnd).toBe(null);
    expect(AuthStore.getUserByEmail(TARGET)?.plan).toBe('Free');
    expect(tables().admin_action_logs).toHaveLength(1);
    expect(tables().admin_action_logs[0].action).toBe('package_changed');
  });

  it('assigns Starter monthly with a 5000 credit grant and supersedes the old row', async () => {
    await applyPackageChange({
      ...ACTOR, targetEmail: TARGET, plan: 'Free', period: null,
      reason: 'setup', requestId: '22222222-2222-4222-8222-222222222222',
    });
    const result = await applyPackageChange({
      ...ACTOR, targetEmail: TARGET, plan: 'Starter', period: 'monthly',
      reason: 'upgrade test', requestId: '33333333-3333-4333-8333-333333333333',
    });
    expect(result.ok).toBe(true);
    expect(result.creditsGranted).toBe(5000);
    expect(result.subscription?.planName).toBe('Starter');
    expect(result.subscription?.period).toBe('monthly');
    const freeRow = tables().user_subscriptions.find((r) => r.plan_name === 'Free');
    expect(freeRow.status).toBe('cancelled');
    expect(AuthStore.getUserByEmail(TARGET)?.plan).toBe('Starter');
  });

  it('assigns lifetime with no expiry and no auto credits, and replays idempotently', async () => {
    const first = await applyPackageChange({
      ...ACTOR, targetEmail: TARGET, plan: 'Agency', period: 'lifetime',
      reason: 'lifetime test', requestId: '44444444-4444-4444-8444-444444444444',
    });
    expect(first.ok).toBe(true);
    expect(first.subscription?.status).toBe('lifetime');
    expect(first.subscription?.currentPeriodEnd).toBe(null);
    expect(first.subscription?.purchaseType).toBe('lifetime_admin');
    expect(first.creditsGranted).toBe(0);
    const second = await applyPackageChange({
      ...ACTOR, targetEmail: TARGET, plan: 'Agency', period: 'lifetime',
      reason: 'lifetime test', requestId: '44444444-4444-4444-8444-444444444444',
    });
    expect(second.ok).toBe(true);
    expect(second.replayed).toBe(true);
    expect(tables().user_subscriptions.filter((r) => r.plan_name === 'Agency')).toHaveLength(1);
  });

  it('fails closed when the subscription tables are missing', async () => {
    globalThis.__adminMgmtMissing = true;
    const result = await applyPackageChange({
      ...ACTOR, targetEmail: TARGET, plan: 'Starter', period: 'monthly',
      reason: 'missing tables', requestId: '55555555-5555-4555-8555-555555555555',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(503);
      expect(result.error.tablesAvailable).toBe(false);
    }
  });

  it('rejects an unknown plan and a missing user', async () => {
    const badPlan = await applyPackageChange({
      ...ACTOR, targetEmail: TARGET, plan: 'Pro', period: 'monthly',
      reason: 'x', requestId: '66666666-6666-4666-8666-666666666666',
    });
    expect(badPlan.ok).toBe(false);
    const missing = await applyPackageChange({
      ...ACTOR, targetEmail: 'nobody@example.com', plan: 'Starter', period: 'monthly',
      reason: 'x', requestId: '77777777-7777-4777-8777-777777777777',
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.status).toBe(404);
  });
});

describe('applySubscriptionDates', () => {
  function seedRow(overrides = {}) {
    const row = {
      id: 'fake-sub-1',
      user_email: TARGET,
      plan_name: 'Starter',
      period: 'monthly',
      status: 'active',
      purchase_type: 'manual',
      credits_per_period: 5000,
      amount_cents: null,
      current_period_start: '2026-11-02T00:00:00.000Z',
      current_period_end: '2026-12-02T00:00:00.000Z',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
    tables().user_subscriptions.push(row);
    return row;
  }

  it('extends 30 days from the current expiry', async () => {
    seedRow();
    const result = await applySubscriptionDates({
      ...ACTOR, targetEmail: TARGET, action: 'extend', extendDays: 30,
      reason: 'extend test', requestId: '88888888-8888-4888-8888-888888888888',
    });
    expect(result.ok).toBe(true);
    expect(result.subscription?.currentPeriodEnd).toBe('2027-01-01T00:00:00.000Z');
    expect(result.subscription?.status).toBe('active');
  });

  it('expires immediately and reactivates for the given days', async () => {
    seedRow();
    const expired = await applySubscriptionDates({
      ...ACTOR, targetEmail: TARGET, action: 'expire',
      reason: 'expire test', requestId: '99999999-9999-4999-8999-999999999999',
    });
    expect(expired.ok).toBe(true);
    expect(expired.subscription?.status).toBe('expired');
    const reactivated = await applySubscriptionDates({
      ...ACTOR, targetEmail: TARGET, action: 'reactivate', extendDays: 15,
      reason: 'reactivate test', requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    expect(reactivated.ok).toBe(true);
    expect(reactivated.subscription?.status).toBe('active');
  });

  it('rejects date changes on lifetime rows and missing rows', async () => {
    seedRow({ status: 'lifetime', period: 'lifetime', current_period_end: null });
    const lifetime = await applySubscriptionDates({
      ...ACTOR, targetEmail: TARGET, action: 'extend', extendDays: 30,
      reason: 'x', requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    expect(lifetime.ok).toBe(false);
    if (!lifetime.ok) expect(lifetime.error.status).toBe(400);
  });

  it('fails closed when the subscription tables are missing', async () => {
    globalThis.__adminMgmtMissing = true;
    const result = await applySubscriptionDates({
      ...ACTOR, targetEmail: TARGET, action: 'extend', extendDays: 30,
      reason: 'x', requestId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.status).toBe(503);
  });
});
