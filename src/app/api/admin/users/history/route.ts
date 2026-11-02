import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { getUserManagementHistory, resolveManagementTarget } from '@/lib/services/admin-user-management';

/** Per-user history for the Users page history modal (matches only). */
export async function GET(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const email = new URL(request.url).searchParams.get('email') || '';
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

  const target = await resolveManagementTarget(email);
  if (!target) return NextResponse.json({ error: 'Target user was not found.' }, { status: 404 });

  try {
    const history = await getUserManagementHistory(target.email);
    return NextResponse.json({ success: true, email: target.email, ...history });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load history.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
