import { describe, expect, it } from 'vitest';
import { resolveActiveMailboxId, resolveSyncTargets } from '@/lib/services/mailbox-selection';

const mailboxes = [
  { id: 'm1', connection_status: 'ACTIVE' },
  { id: 'm2', connection_status: 'ACTIVE' },
  { id: 'm3', connection_status: 'REAUTH_REQUIRED' },
];

describe('resolveActiveMailboxId', () => {
  it('keeps a stored id that is still connected', () => {
    expect(resolveActiveMailboxId('m2', mailboxes)).toBe('m2');
  });

  it('drops a stored id that is no longer connected (falls back to All)', () => {
    expect(resolveActiveMailboxId('gone', mailboxes)).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(resolveActiveMailboxId(null, mailboxes)).toBeNull();
    expect(resolveActiveMailboxId('', mailboxes)).toBeNull();
  });
});

describe('resolveSyncTargets', () => {
  it('syncs only the selected mailbox, even when it needs reconnection (so the API can report it)', () => {
    expect(resolveSyncTargets(mailboxes, 'm3')).toEqual([{ id: 'm3', connection_status: 'REAUTH_REQUIRED' }]);
  });

  it('returns no targets for an unknown selection', () => {
    expect(resolveSyncTargets(mailboxes, 'gone')).toEqual([]);
  });

  it('syncs every ACTIVE mailbox when All accounts is selected', () => {
    expect(resolveSyncTargets(mailboxes, null)).toEqual([
      { id: 'm1', connection_status: 'ACTIVE' },
      { id: 'm2', connection_status: 'ACTIVE' },
    ]);
  });
});
