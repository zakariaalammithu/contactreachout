import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
  };
  const client = { from: vi.fn(() => chain) };
  return { chain, client, clientOverride: undefined };
});

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => (mocks.clientOverride === undefined ? mocks.client : mocks.clientOverride),
}));

const { CreditWalletServerService } = await import('@/lib/services/credit-wallet-server-service');
const { CreditWalletService } = await import('@/lib/services/credit-wallet-service');

// GET /api/credits 500d on live because getTransactionsForServer had no
// unprovisioned-account fallback: public.users has 0 rows (verified
// 2026-11-08 via the Supabase connector), so the users lookup throws
// CREDIT_DATABASE_USER_NOT_FOUND — the wallet call fell back to the
// in-memory wallet fine, but the ledger call rethrew and the whole
// endpoint failed. The editor then showed "Unavailable" while the
// sidebar (local wallet) showed 1,000,000. These tests pin the
// fallbacks for a missing users row, a missing users table, and no
// Supabase client at all.

const ADMIN = 'mithusquare@gmail.com';
const REGULAR = 'regular-user-credit-fallback@example.com';

function makeChainFluent() {
  mocks.chain.select.mockReturnValue(mocks.chain);
  mocks.chain.eq.mockReturnValue(mocks.chain);
  mocks.chain.order.mockReturnValue(mocks.chain);
}

describe('credit wallet server fallback (unprovisioned account)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientOverride = undefined;
    makeChainFluent();
  });

  it('falls back to the in-memory wallet when the users row is missing (live case)', async () => {
    mocks.chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const wallet = await CreditWalletServerService.getWalletForServer(ADMIN);
    expect(wallet.totalCreditsAvailable).toBe(1000000);
    expect(wallet.bonusCredits).toBe(999900);
  });

  it('falls back to in-memory transactions when the users row is missing', async () => {
    mocks.chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const txs = await CreditWalletServerService.getTransactionsForServer(ADMIN);
    // The fallback returns the local ledger (whatever it holds), never a 500.
    expect(txs).toEqual(CreditWalletService.getTransactions(ADMIN));
    expect(mocks.client.from).toHaveBeenCalledWith('users');
  });

  it('falls back when the users table itself is absent (lookup failed)', async () => {
    mocks.chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "public.users" does not exist' },
    });
    const wallet = await CreditWalletServerService.getWalletForServer(ADMIN);
    expect(wallet.totalCreditsAvailable).toBe(1000000);

    mocks.chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "public.users" does not exist' },
    });
    const txs = await CreditWalletServerService.getTransactionsForServer(ADMIN);
    expect(txs).toEqual(CreditWalletService.getTransactions(ADMIN));
  });

  it('falls back when no Supabase client is configured', async () => {
    mocks.clientOverride = null;
    const wallet = await CreditWalletServerService.getWalletForServer(ADMIN);
    expect(wallet.totalCreditsAvailable).toBe(1000000);
    const txs = await CreditWalletServerService.getTransactionsForServer(ADMIN);
    expect(txs).toEqual(CreditWalletService.getTransactions(ADMIN));
  });

  it('gives a non-admin user the 100-credit free grant, not the admin grant', async () => {
    mocks.chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const wallet = await CreditWalletServerService.getWalletForServer(REGULAR);
    expect(wallet.totalCreditsAvailable).toBe(100);
    expect(wallet.bonusCredits).toBe(0);
  });

  it('still reads the durable wallet when the users row and wallet row exist', async () => {
    mocks.chain.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'db-user-1' }, error: null })
      .mockResolvedValueOnce({
        data: {
          free_monthly_credits: 100,
          free_monthly_used: 20,
          paid_credits: 5,
          bonus_credits: 0,
          lifetime_credits_purchased: 5,
          lifetime_credits_used: 0,
          free_credit_period_start: '2026-11-01T00:00:00.000Z',
          free_credit_period_end: '2026-12-01T00:00:00.000Z',
        },
        error: null,
      });
    const wallet = await CreditWalletServerService.getWalletForServer(REGULAR);
    expect(wallet.totalCreditsAvailable).toBe(85);
    expect(wallet.planName).toBe('Database');
  });

  it('deducts from the in-memory wallet when the users row is missing', async () => {
    mocks.chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const result = await CreditWalletServerService.deductCreditsForServer(
      'SUCCESSFUL_SUBMISSION',
      'camp-fallback-1',
      'lead-fallback-1',
      'Acme',
      ADMIN,
    );
    expect(result.success).toBe(true);
    expect(result.cost).toBe(1);
    expect(result.wallet.totalCreditsAvailable).toBe(999999);
  });

  it('still surfaces a real database failure instead of falling back', async () => {
    // Users row exists, but the wallet read itself fails: that is a real
    // database failure, not an unprovisioned account, so it must throw.
    mocks.chain.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'db-user-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'connection timeout after 5000ms' } });
    await expect(CreditWalletServerService.getWalletForServer(REGULAR)).rejects.toThrow(
      'CREDIT_DATABASE_READ_FAILED',
    );
  });
});
