import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// The EXACT live PostgREST error from campaign 2-1 (2026-11-02):
// message "Could not find the table 'public.user_subscriptions' in the
// schema cache", code PGRST205. The old matcher only recognised
// "does not exist", so this error threw instead of degrading to
// "no subscriptions" — and every lead FAILED before discovery.
function liveMissingTableError() {
  const error = new Error("Could not find the table 'public.user_subscriptions' in the schema cache");
  error.code = 'PGRST205';
  return error;
}

class RejectingBuilder {
  constructor(error) {
    this.error = error;
  }
  select() { return this; }
  eq() { return this; }
  neq() { return this; }
  in() { return this; }
  gt() { return this; }
  lte() { return this; }
  order() { return this; }
  limit() { return this; }
  async maybeSingle() { throw this.error; }
  async single() { throw this.error; }
  then(_resolve, reject) { reject(this.error); }
}

globalThis.__missingTableError = liveMissingTableError();

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => ({
    from: () => new RejectingBuilder(globalThis.__missingTableError),
  }),
}));

import {
  getSendingAccess,
  getSubscriptionForUser,
  listSubscriptionsForUser,
} from '@/lib/services/subscription-service';

beforeEach(() => {
  globalThis.__missingTableError = liveMissingTableError();
});

describe('missing subscription table (campaign 2-1 regression)', () => {
  it('degrades to "no subscriptions" on the exact live PGRST205 error', async () => {
    await expect(listSubscriptionsForUser('user@demo.com')).resolves.toEqual([]);
    await expect(getSubscriptionForUser('user@demo.com')).resolves.toBe(null);
    await expect(getSendingAccess('user@demo.com')).resolves.toEqual({ blocked: false });
  });

  it('also degrades when only the message is present (no code)', async () => {
    globalThis.__missingTableError = new Error(
      "Could not find the table 'public.user_subscriptions' in the schema cache",
    );
    await expect(listSubscriptionsForUser('user@demo.com')).resolves.toEqual([]);
    await expect(getSendingAccess('user@demo.com')).resolves.toEqual({ blocked: false });
  });

  it('still throws genuine errors instead of swallowing them', async () => {
    globalThis.__missingTableError = new Error('connection refused');
    await expect(listSubscriptionsForUser('user@demo.com')).rejects.toThrow('connection refused');
  });
});
