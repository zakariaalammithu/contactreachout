import { NextRequest, NextResponse } from 'next/server';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { getConnectedMailboxForOwner } from '@/lib/persistence/gmail-mailbox-repository';
import { registerGmailWatch } from '@/lib/services/gmail-sync-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await resolvePersistenceContext(request);
    if (!(await getConnectedMailboxForOwner(context, params.id))) return NextResponse.json({ error: 'Mailbox was not found.' }, { status: 404 });
    const watch = await registerGmailWatch(params.id);
    return NextResponse.json({ success: true, watchExpirationAt: watch.expirationAt });
  } catch (error) {
    if (error instanceof PersistenceAuthorizationError) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    const code = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: code === 'GMAIL_PUBSUB_NOT_CONFIGURED' ? 'Gmail notification infrastructure is not configured.' : 'Gmail watch registration failed.' }, { status: 503 });
  }
}
