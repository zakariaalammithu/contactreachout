import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  // Generate OAuth CSRF state & nonce
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  let targetUrl: string;

  if (googleClientId && googleClientId.includes('.apps.googleusercontent.com')) {
    // Live Google OAuth 2.0 / OpenID Connect Redirect URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('nonce', nonce);
    googleAuthUrl.searchParams.set('prompt', 'select_account'); // Forces Google Account Chooser
    targetUrl = googleAuthUrl.toString();
  } else {
    // Dev Sandbox Consent Chooser matching accounts.google.com/v3/signin/accountchooser
    const mockConsentUrl = new URL(`${protocol}://${host}/api/auth/google/mock-consent`);
    mockConsentUrl.searchParams.set('state', state);
    mockConsentUrl.searchParams.set('redirect_uri', redirectUri);
    targetUrl = mockConsentUrl.toString();
  }

  const res = NextResponse.redirect(targetUrl);

  // Set security cookies for state & nonce validation
  res.cookies.set('oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
  res.cookies.set('oauth_nonce', nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

  return res;
}
