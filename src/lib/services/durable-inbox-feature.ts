import 'server-only';

/** Server-evaluated only. Clients cannot opt themselves into durable Inbox. */
export function isDurableInboxEnabled(): boolean {
  return process.env.DURABLE_INBOX_ENABLED === 'true';
}
