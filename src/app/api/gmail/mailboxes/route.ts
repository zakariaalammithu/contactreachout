import { NextRequest, NextResponse } from 'next/server';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { disconnectMailbox, listConnectedMailboxes } from '@/lib/persistence/gmail-mailbox-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ mailboxes: await listConnectedMailboxes(await resolvePersistenceContext(request)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PersistenceAuthorizationError ? 'Authentication is required.' : 'Mailbox list is unavailable.' }, { status: error instanceof PersistenceAuthorizationError ? 401 : 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const mailboxId = request.nextUrl.searchParams.get('mailboxId');
    if (!mailboxId) return NextResponse.json({ error: 'mailboxId is required.' }, { status: 400 });
    const disconnected = await disconnectMailbox(await resolvePersistenceContext(request), mailboxId);
    return disconnected ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Mailbox was not found.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PersistenceAuthorizationError ? 'Authentication is required.' : 'Mailbox disconnect is unavailable.' }, { status: error instanceof PersistenceAuthorizationError ? 401 : 503 });
  }
}
