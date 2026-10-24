import { NextRequest, NextResponse } from 'next/server';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { createMailboxOauthState, gmailAuthorizeUrl, gmailOAuthConfiguration, gmailRedirectUri } from '@/lib/services/gmail-mailbox-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!gmailOAuthConfiguration().configured) {
    return NextResponse.json({ error: 'Google OAuth is not configured for Gmail connection.', code: 'GMAIL_OAUTH_NOT_CONFIGURED', setup: process.env.NODE_ENV === 'production' ? 'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GMAIL_OAUTH_REDIRECT_URI. Register that exact HTTPS callback URL with the Google OAuth client.' : 'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then register http://localhost:3000/api/gmail/mailboxes/callback as an authorized redirect URI.' }, { status: 503 });
  }
  try {
    // Resolve the redirect before authorizing so a production configuration
    // error is explicit and never falls back to a request supplied host.
    gmailRedirectUri(request);
    const context = await resolvePersistenceContext(request);
    const state = createMailboxOauthState(context);
    const response = NextResponse.redirect(gmailAuthorizeUrl(request, state));
    response.cookies.set('gmail_mailbox_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/gmail/mailboxes',
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('GMAIL_OAUTH_REDIRECT_URI')) {
      return NextResponse.json({ error: 'Google OAuth redirect URI is not configured for production.', code: 'GMAIL_OAUTH_REDIRECT_URI_NOT_CONFIGURED', setup: 'Set GMAIL_OAUTH_REDIRECT_URI to the exact HTTPS callback URL ending in /api/gmail/mailboxes/callback and add the same URL to the Google OAuth client.' }, { status: 503 });
    }
    const status = error instanceof PersistenceAuthorizationError ? 401 : 503;
    return NextResponse.json({ error: status === 401 ? 'Authentication is required.' : 'Durable mailbox storage is not configured or unavailable.', code: status === 401 ? 'AUTHENTICATION_REQUIRED' : 'DURABLE_INBOX_UNAVAILABLE' }, { status });
  }
}
