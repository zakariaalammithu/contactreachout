import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const chain = {
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const client = { from: vi.fn(() => chain) };
  return { chain, client };
});

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => mocks.client,
}));

const { claimMailboxSyncEvent, finishMailboxSyncEvent } = await import('@/lib/persistence/gmail-sync-repository');

function makeChainFluent() {
  mocks.chain.insert.mockReturnValue(mocks.chain);
  mocks.chain.update.mockReturnValue(mocks.chain);
  mocks.chain.eq.mockReturnValue(mocks.chain);
  mocks.chain.select.mockReturnValue(mocks.chain);
}

const input = {
  mailboxId: 'mailbox-1',
  organizationId: 'organization-1',
  providerEventId: 'event-1',
  historyId: 'history-1',
  payload: { emailAddress: 'owner@example.com', historyId: 'history-1' },
};

describe('Gmail mailbox sync event claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeChainFluent();
  });

  it('claims a newly received event once', async () => {
    mocks.chain.maybeSingle.mockResolvedValueOnce({ data: { id: 'event-row' }, error: null });
    await expect(claimMailboxSyncEvent(input)).resolves.toBe(true);
    expect(mocks.chain.insert).toHaveBeenCalledOnce();
    expect(mocks.chain.update).not.toHaveBeenCalled();
  });

  it('reclaims only a duplicate event whose conditional retryable update succeeds', async () => {
    mocks.chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: { message: 'duplicate key value violates unique constraint' } })
      .mockResolvedValueOnce({ data: { id: 'event-row' }, error: null });

    await expect(claimMailboxSyncEvent(input)).resolves.toBe(true);
    expect(mocks.chain.update).toHaveBeenCalledWith(expect.objectContaining({ processing_status: 'PROCESSING', processed_at: null }));
    expect(mocks.chain.eq).toHaveBeenCalledWith('processing_status', 'RETRYABLE_FAILURE');
  });

  it('does not process a duplicate delivery when no retryable event was atomically reclaimed', async () => {
    mocks.chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: { message: 'duplicate key value violates unique constraint' } })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(claimMailboxSyncEvent(input)).resolves.toBe(false);
  });

  it('finishes only the worker-held PROCESSING claim', async () => {
    mocks.chain.update.mockReturnValue(mocks.chain);
    mocks.chain.eq.mockReturnValue(mocks.chain);
    await expect(finishMailboxSyncEvent('mailbox-1', 'event-1', 'PROCESSED')).resolves.toBeUndefined();
    expect(mocks.chain.update).toHaveBeenCalledWith(expect.objectContaining({ processing_status: 'PROCESSED' }));
    expect(mocks.chain.eq).toHaveBeenCalledWith('processing_status', 'PROCESSING');
  });
});
