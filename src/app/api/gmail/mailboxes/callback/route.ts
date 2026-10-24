import { NextRequest, NextResponse } from 'next/server';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { exchangeAndStoreGmailMailbox, safeStateMatches } from '@/lib/services/gmail-mailbox-service';

export const dynamic = 'force-dynamic';

function redirectWithStatus(request: NextRequest, status: 'connected' | 'failed') {
  const response = NextResponse.redirect(new URL(`/inbox?gmail=${status}`, request.url));
  response.cookies.set('gmail_mailbox_oauth_state', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/api/gmail/mailboxes', expires: new Date(0) });
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get('gmail_mailbox_oauth_state')?.value;
  if (!code || !safeStateMatches(expectedState, state)) return redirectWithStatus(request, 'failed');

  try {
    const context = await resolvePersistenceContext(request);
    const stateOwner = expectedState?.split('.', 1)[0];
    if (!stateOwner || stateOwner !== context.appUserId) return redirectWithStatus(request, 'failed');
    await exchangeAndStoreGmailMailbox(request, context, code);
    return redirectWithStatus(request, 'connected');
  } catch (error) {
    if (error instanceof PersistenceAuthorizationError) return NextResponse.redirect(new URL('/login', request.url));
    return redirectWithStatus(request, 'failed');
  }
}
