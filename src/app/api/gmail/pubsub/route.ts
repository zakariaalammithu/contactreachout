import { NextRequest, NextResponse } from 'next/server';
import { findConnectedMailboxByEmail } from '@/lib/persistence/gmail-mailbox-repository';
import { claimMailboxSyncEvent, finishMailboxSyncEvent } from '@/lib/persistence/gmail-sync-repository';
import { synchronizeGmailMailbox } from '@/lib/services/gmail-sync-service';
import { isExpectedGooglePubSubPush } from '@/lib/services/gmail-pubsub-security';

export const dynamic = 'force-dynamic';

type PushBody = { message?: { messageId?: string; data?: string } };

async function verifiedGooglePush(request: NextRequest): Promise<boolean> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const audience = process.env.GOOGLE_GMAIL_PUBSUB_AUDIENCE;
  const serviceAccount = process.env.GOOGLE_GMAIL_PUBSUB_SERVICE_ACCOUNT;
  if (!token || !audience || !serviceAccount) return false;
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!response.ok) return false;
  const claims = await response.json() as { aud?: string; iss?: string; email?: string; email_verified?: string | boolean };
  return isExpectedGooglePubSubPush(claims, audience, serviceAccount);
}

export async function POST(request: NextRequest) {
  if (!(await verifiedGooglePush(request))) return NextResponse.json({ error: 'Unauthorized notification.' }, { status: 401 });
  let body: PushBody;
  try {
    body = await request.json() as PushBody;
  } catch {
    return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
  }

  const eventId = body.message?.messageId;
  let decoded: { emailAddress?: string; historyId?: string } | null;
  try {
    decoded = body.message?.data ? JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf8')) as { emailAddress?: string; historyId?: string } : null;
  } catch {
    return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
  }
  const email = decoded?.emailAddress?.toLowerCase().trim();
  if (!eventId || !email) return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });

  try {
    const mailbox = await findConnectedMailboxByEmail(email);
    // Returning 204 for an unknown mailbox prevents sender-address probing and
    // permits Pub/Sub acknowledgement without fabricating an inbox event.
    if (!mailbox) return new NextResponse(null, { status: 204 });
    const claimed = await claimMailboxSyncEvent({ mailboxId: mailbox.id, organizationId: mailbox.organization_id, providerEventId: eventId, historyId: decoded?.historyId, payload: { emailAddress: email, historyId: decoded?.historyId } });
    if (!claimed) return new NextResponse(null, { status: 204 });
    try {
      await synchronizeGmailMailbox(mailbox.id);
      await finishMailboxSyncEvent(mailbox.id, eventId, 'PROCESSED');
      return new NextResponse(null, { status: 204 });
    } catch {
      try {
        await finishMailboxSyncEvent(mailbox.id, eventId, 'RETRYABLE_FAILURE');
      } catch {
        // The provider must retry when the event state itself cannot be
        // recorded. Returning 503 avoids acknowledging a valid notification.
      }
      return NextResponse.json({ error: 'Mailbox synchronization deferred.' }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: 'Mailbox synchronization deferred.' }, { status: 503 });
  }
}
