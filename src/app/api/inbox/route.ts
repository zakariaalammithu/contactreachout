import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { InboxStore } from '@/lib/services/inbox-store';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';
import { isDurableInboxEnabled } from '@/lib/services/durable-inbox-feature';
import { resolvePersistenceContext, PersistenceAuthorizationError } from '@/lib/persistence/identity';
import { listInboxConversations } from '@/lib/persistence/inbox-conversation-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (isDurableInboxEnabled()) {
    try {
      const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 50), 1), 100);
      const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') || 0), 0);
      const archived = request.nextUrl.searchParams.get('archived');
      const unread = request.nextUrl.searchParams.get('unread') === 'true';
      const data = await listInboxConversations(await resolvePersistenceContext(request), { limit, offset, unread, archived: archived === null ? undefined : archived === 'true', search: request.nextUrl.searchParams.get('search') || undefined, mailboxId: request.nextUrl.searchParams.get('mailboxId') || undefined });
      return NextResponse.json({ success: true, durable: true, ...data });
    } catch (error) {
      return NextResponse.json({ error: error instanceof PersistenceAuthorizationError ? 'Authentication is required.' : 'Inbox is unavailable.' }, { status: error instanceof PersistenceAuthorizationError ? 401 : 503 });
    }
  }
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userEmail = session.email.toLowerCase().trim();
  const user = AuthStore.getUserByEmail(userEmail);
  const activeReplyEmail = user?.replyEmail || (user?.isEmailVerified ? userEmail : userEmail);

  const scope = request.nextUrl.searchParams.get('scope');
  const isAdmin = session.role === 'SUPER_ADMIN';

  const messages = (isAdmin && scope === 'all')
    ? InboxStore.getAllMessagesForAdmin()
    : InboxStore.getMessagesForUser(userEmail);

  const unreadCount = InboxStore.getUnreadCount(userEmail);
  const wallet = CreditWalletService.getWallet(userEmail);

  return NextResponse.json({
    success: true,
    userEmail,
    forwardingEmail: activeReplyEmail,
    unreadCount,
    availableCredits: wallet.totalCreditsAvailable,
    messages,
  });
}

export async function PATCH(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const { messageId, action = 'mark_read' } = await request.json();
    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const isAdmin = session.role === 'SUPER_ADMIN';
    let updated = null;

    if (action === 'archive') {
      updated = InboxStore.archiveMessage(session.email, messageId, isAdmin);
    } else if (action === 'unarchive') {
      updated = InboxStore.unarchiveMessage(session.email, messageId, isAdmin);
    } else if (action === 'mark_unread') {
      updated = InboxStore.markAsUnread(session.email, messageId, isAdmin);
    } else {
      updated = InboxStore.markAsRead(session.email, messageId, isAdmin);
    }

    if (!updated) {
      return NextResponse.json({ error: 'Message not found or access denied.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}
