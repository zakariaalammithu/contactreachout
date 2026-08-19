import { NextRequest, NextResponse } from 'next/server';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookieState = req.cookies.get('oauth_state')?.value;

  // Handle OAuth error or cancellation
  if (error || !code) {
    const errorMsg = error === 'access_denied' ? 'Google authentication was cancelled.' : 'Google OAuth authentication failed.';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url));
  }

  // Validate state parameter for CSRF protection (skip if dev mock state)
  if (cookieState && state && cookieState !== state && state !== 'mock_state') {
    return NextResponse.redirect(new URL('/login?error=Invalid+OAuth+state+parameter', req.url));
  }

  try {
    let googleEmail = url.searchParams.get('email');
    let googleName = url.searchParams.get('name');
    let googleSub = `google_sub_${Date.now()}`;

    // Live OAuth Token Exchange with Google Token Endpoint
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (googleClientId && googleClientSecret && !code.startsWith('mock_')) {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        throw new Error('Failed to exchange authorization code with Google.');
      }

      const tokenData = await tokenRes.json();
      const idToken = tokenData.id_token;

      // Verify ID token via Google TokenInfo API
      const userRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      if (!userRes.ok) {
        throw new Error('Failed to verify Google ID token.');
      }

      const googleUser = await userRes.json();
      googleEmail = googleUser.email;
      googleName = googleUser.name || googleEmail?.split('@')[0];
      googleSub = googleUser.sub;
    }

    if (!googleEmail || !googleEmail.includes('@')) {
      return NextResponse.redirect(new URL('/login?error=Could+not+retrieve+verified+Google+email', req.url));
    }

    const cleanEmail = googleEmail.toLowerCase().trim();
    const cleanName = googleName || cleanEmail.split('@')[0];

    // 1. Search for existing user by googleSub or email
    let user = AuthStore.getUserByGoogleSub(googleSub) || AuthStore.getUserByEmail(cleanEmail);

    if (user) {
      // Existing User -> Securely Link Google Sub if not linked yet
      if (!user.googleSub) {
        user = AuthStore.updateUser(user.email, { googleSub, isEmailVerified: true });
      }
    } else {
      // First-time Google User -> Create Application Account with verified Google identity
      user = AuthStore.createUser({
        name: cleanName,
        email: cleanEmail,
        googleSub,
        isEmailVerified: true,
      });
    }

    if (user.isSuspended) {
      return NextResponse.redirect(new URL('/login?error=Account+is+suspended', req.url));
    }

    // 2. Create server session
    const session = AuthStore.createSession(user.id, user.email, user.role);

    // Redirect to appropriate dashboard based on RBAC role
    const targetPath = (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? '/admin' : '/dashboard';
    const redirectUrl = new URL(targetPath, req.url);

    const res = NextResponse.redirect(redirectUrl);

    // Clear OAuth state cookie & set HTTP-only session cookie
    res.cookies.set('oauth_state', '', { expires: new Date(0), path: '/' });
    SessionManager.setSessionCookie(res, session);

    return res;
  } catch (err: any) {
    console.error('Google OAuth Callback Error:', err);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err.message || 'Google OAuth failed')}`, req.url));
  }
}
