import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';

export async function GET(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const account = AuthStore.getUserByEmail(session.email);
  return NextResponse.json({
    authenticated: true,
    user: { id: session.userId, email: session.email, role: session.role, name: account?.name || session.email.split('@')[0], avatarUrl: account?.avatarUrl || null },
  });
}
