import { NextRequest, NextResponse } from 'next/server';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { getConnectedMailboxForOwner } from '@/lib/persistence/gmail-mailbox-repository';
import { registerGmailWatch, synchronizeGmailMailbox } from '@/lib/services/gmail-sync-service';

export const dynamic = 'force-dynamic';

/**
 * Manual "sync now" for one connected mailbox: pulls any Gmail changes the
 * History API knows about, then best-effort renews the Pub/Sub watch (which
 * expires after roughly seven days and otherwise silently stops delivery).
 * This gives mailbox owners a recovery path that does not depend on a
 * Pub/Sub notification having arrived first.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await resolvePersistenceContext(request);
    if (!(await getConnectedMailboxForOwner(context, params.id))) return NextResponse.json({ error: 'Mailbox was not found.' }, { status: 404 });
    const result = await synchronizeGmailMailbox(params.id);
    let watchExpirationAt: string | null = null;
    try {
      watchExpirationAt = (await registerGmailWatch(params.id)).expirationAt;
    } catch { /* Pub/Sub may not be configured; the sync above still counts. */ }
    return NextResponse.json({ success: true, imported: result.imported, duplicates: result.duplicates, cursorRecovered: result.cursorRecovered, watchExpirationAt });
  } catch (error) {
    if (error instanceof PersistenceAuthorizationError) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    const code = error instanceof Error ? error.message : '';
    const status = code === 'MAILBOX_NOT_AVAILABLE' ? 404 : 503;
    return NextResponse.json({ error: code === 'GMAIL_REAUTH_REQUIRED' ? 'This Gmail mailbox needs to be reconnected.' : 'Gmail synchronization failed.' }, { status });
  }
}
