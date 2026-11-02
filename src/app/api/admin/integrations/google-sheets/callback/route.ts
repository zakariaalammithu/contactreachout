import { NextRequest, NextResponse } from 'next/server';
import { SecretManager } from '@/lib/security/secret-manager';

function htmlPage(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
      `<body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 0 16px; color: #18181b;">` +
      `<h1 style="font-size: 20px;">${title}</h1>${body}` +
      `<p style="font-size: 12px; color: #71717a;">ContactReachout &middot; Google Sheets OAuth callback</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

/**
 * Google OAuth callback for Sheets. This route exists so the redirect URI
 * shown on the admin Google Sheets page never 404s.
 *
 * Honest by design: the authorization code is exchanged for tokens to
 * verify the grant, but tokens are NOT stored anywhere (no durable token
 * storage exists yet), and the response never claims a connected state.
 * Sheets sync is not yet live.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  if (error) {
    return htmlPage(
      'Google authorization failed',
      `<p>Google returned an OAuth error: <code>${error}</code>. No connection was recorded and no spreadsheet sync is active.</p>`,
      400,
    );
  }

  if (!code) {
    return htmlPage(
      'Missing authorization code',
      '<p>No authorization code was provided. Start the Google Sheets connection from the admin integrations page and approve access, then Google will redirect back here.</p>',
      400,
    );
  }

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri =
    SecretManager.getSecret('GOOGLE_REDIRECT_URI') ||
    process.env.GOOGLE_REDIRECT_URI ||
    `${protocol}://${host}/api/admin/integrations/google-sheets/callback`;
  const clientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = SecretManager.getSecret('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    return htmlPage(
      'Google OAuth is not configured',
      '<p>The Google OAuth client ID or secret is not set in server environment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then retry the connection.</p>',
      503,
    );
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text().catch(() => '');
      let reason = `Token exchange failed (HTTP ${tokenRes.status}).`;
      try {
        const parsed = JSON.parse(detail) as { error?: string; error_description?: string };
        if (parsed.error) reason += ` Google error: ${parsed.error}.`;
      } catch { /* keep generic reason; never echo raw bodies */ }
      return htmlPage(
        'Google authorization could not be verified',
        `<p>${reason} No connection was recorded and no spreadsheet sync is active.</p>`,
        502,
      );
    }

    // Exchange succeeded, but deliberately NOT stored: there is no
    // durable token storage for Sheets yet, so claiming "connected"
    // would be fake. The grant was verified and then discarded.
    return htmlPage(
      'Google authorization verified — Sheets sync is not yet live',
      '<p>Google accepted the authorization, but Google Sheets sync is not yet live: access tokens are not stored durably, so no spreadsheet sync is active and no connection is recorded. ' +
        'Close this tab and return to the admin dashboard. A future update will add durable token storage before Sheets sync is offered.</p>',
    );
  } catch {
    return htmlPage(
      'Google authorization could not be verified',
      '<p>The token exchange request failed (network error). No connection was recorded and no spreadsheet sync is active.</p>',
      502,
    );
  }
}
