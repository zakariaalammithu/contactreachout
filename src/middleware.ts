import { NextRequest, NextResponse } from 'next/server';

const protectedPrefixes = [
  '/dashboard', '/campaigns', '/ai-personalization', '/unibox', '/leads', '/import',
  '/processing', '/results', '/logs', '/settings', '/profile', '/templates', '/credits',
  '/referral', '/checkout', '/admin',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected) return NextResponse.next();

  if (!request.cookies.get('app_session')?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('tab', 'signin');
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/campaigns/:path*', '/ai-personalization/:path*', '/unibox/:path*',
    '/leads/:path*', '/import/:path*', '/processing/:path*', '/results/:path*', '/logs/:path*',
    '/settings/:path*', '/profile/:path*', '/templates/:path*', '/credits/:path*', '/referral/:path*',
    '/checkout/:path*', '/admin/:path*',
  ],
};
