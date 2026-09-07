import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const user = AuthStore.getUserByEmail(session.email);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  return NextResponse.json({ user: { name: user.name, email: user.email, phone: user.phone || '', avatarUrl: user.avatarUrl || '', createdAt: user.createdAt } });
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().default(''),
  avatarUrl: z.string().max(1_500_000).optional().default(''),
});

export async function PATCH(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid profile.' }, { status: 400 });
  const user = AuthStore.updateUser(session.email, parsed.data);
  return NextResponse.json({ success: true, user: { name: user.name, email: user.email, phone: user.phone || '', avatarUrl: user.avatarUrl || '' } });
}
