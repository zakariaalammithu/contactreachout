import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  const session = SessionManager.getSessionFromRequest(req);
  const res = NextResponse.json({ success: true, message: 'Signed out successfully.' });

  SessionManager.clearSessionCookie(res, session?.sessionId);
  return res;
}
