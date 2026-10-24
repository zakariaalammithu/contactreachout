import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = [
  '/dashboard', '/campaigns', '/ai-personalization', '/unibox', '/leads', '/crm', '/import',
  '/processing', '/results', '/logs', '/settings', '/profile', '/templates', '/credits',
  '/referral', '/checkout', '/admin',
];

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(first: string, second: string): boolean {
  if (first.length !== second.length) return false;
  let mismatch = 0;
  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return mismatch === 0;
}

async function getVerifiedSessionRole(sessionToken: string): Promise<string | null> {
  const parts = sessionToken.split('.');
  if (parts.length !== 3 || parts[0] !== 'v2') return null;

  const [, payload, signature] = parts;
  // Fail closed in production: with no configured SESSION_SECRET there is no
  // safe way to verify a session, and the former hard-coded fallback was
  // public knowledge (it ships in the source), which made sessions forgeable.
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'contactreachout-session-secret');
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = toBase64Url(new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  ));
  if (!timingSafeEqual(expected, signature)) return null;

  try {
    const parsed = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!parsed?.role || !Number.isFinite(parsed?.expiresAt) || Date.now() > parsed.expiresAt) return null;
    return typeof parsed.role === 'string' ? parsed.role : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected) return NextResponse.next();

  const sessionToken = request.cookies.get('app_session')?.value;
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('tab', 'signin');
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const verifiedRole = await getVerifiedSessionRole(sessionToken);
  if (!verifiedRole) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('tab', 'signin');
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (verifiedRole !== 'ADMIN' && verifiedRole !== 'SUPER_ADMIN') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('tab', 'signin');
      loginUrl.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/campaigns/:path*', '/ai-personalization/:path*', '/unibox/:path*',
    '/leads/:path*', '/crm/:path*', '/import/:path*', '/processing/:path*', '/results/:path*', '/logs/:path*',
    '/settings/:path*', '/profile/:path*', '/templates/:path*', '/credits/:path*', '/referral/:path*',
    '/checkout/:path*', '/admin/:path*',
  ],
};
