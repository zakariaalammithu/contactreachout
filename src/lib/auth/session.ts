import { NextRequest, NextResponse } from 'next/server';
import { AuthStore, UserSession } from './auth-store';

export class SessionManager {
  public static readonly COOKIE_NAME = 'app_session';

  /**
   * Sets an HTTP-only secure session cookie on a NextResponse object.
   */
  public static setSessionCookie(res: NextResponse, session: UserSession): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookies.set({
      name: this.COOKIE_NAME,
      value: session.sessionId,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expiresAt),
    });
  }

  /**
   * Reads and verifies session from request cookies or Authorization header.
   */
  public static getSessionFromRequest(req: NextRequest): UserSession | null {
    const cookieToken = req.cookies.get(this.COOKIE_NAME)?.value;
    const authHeader = req.headers.get('Authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const token = cookieToken || headerToken;
    if (!token) return null;

    return AuthStore.getSession(token);
  }

  /**
   * Clears the HTTP-only session cookie on logout.
   */
  public static clearSessionCookie(res: NextResponse, sessionId?: string): void {
    if (sessionId) {
      AuthStore.deleteSession(sessionId);
    }
    res.cookies.set({
      name: this.COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
  }
}
