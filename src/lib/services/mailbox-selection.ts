/**
 * Multi-mailbox selection for the inbox (2026-11-01).
 *
 * The server already supports many connected Gmail accounts: the mailbox
 * model is one row per (organization, email), each account gets its own
 * Pub/Sub watch, push notifications route by email address, and the
 * conversation list accepts a mailboxId filter. What was missing was the
 * client-side "which account is active" system. These pure helpers are that
 * system, with no migration: the choice is stored in the browser
 * (localStorage) because it only controls what this dashboard shows and
 * syncs. Sending is deliberately NOT governed by it — a reply must go out
 * from the mailbox that received the thread, otherwise Gmail threading
 * breaks and the prospect hears from an unexpected address.
 */

export type SelectableMailbox = {
  id: string;
  connection_status: string;
};

export const ACTIVE_MAILBOX_STORAGE_KEY = 'cr-active-mailbox-id';

/** A stored active id counts only when it is still a connected mailbox. */
export function resolveActiveMailboxId(
  stored: string | null | undefined,
  mailboxes: SelectableMailbox[],
): string | null {
  if (!stored) return null;
  return mailboxes.some((mailbox) => mailbox.id === stored) ? stored : null;
}

/**
 * Which mailboxes a Sync now covers. A selected mailbox syncs even when it
 * is not ACTIVE, so the API can report that it needs reconnection. "All
 * accounts" syncs only ACTIVE mailboxes (a broken one must not fail the
 * whole batch).
 */
export function resolveSyncTargets(
  mailboxes: SelectableMailbox[],
  activeId: string | null,
): SelectableMailbox[] {
  if (activeId) {
    const selected = mailboxes.find((mailbox) => mailbox.id === activeId);
    return selected ? [selected] : [];
  }
  return mailboxes.filter((mailbox) => mailbox.connection_status === 'ACTIVE');
}
