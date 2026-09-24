import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { InboxStore } from '@/lib/services/inbox-store';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    const { messageId } = await request.json();
    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const isAdmin = session.role === 'SUPER_ADMIN';
    const updated = InboxStore.markAsRead(session.email, messageId, isAdmin);
    if (!updated) {
      return NextResponse.json({ error: 'Message not found or access denied.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}
