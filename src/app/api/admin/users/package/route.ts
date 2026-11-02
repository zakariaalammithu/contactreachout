import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { applyPackageChange } from '@/lib/services/admin-user-management';
import { z } from 'zod';

const packageSchema = z.object({
  targetUserEmail: z.string().email(),
  plan: z.string(),
  period: z.string().nullable().optional(),
  reason: z.string().trim().min(1).max(500),
  requestId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = packageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid package change.' }, { status: 400 });
  }

  try {
    const result = await applyPackageChange({
      actorEmail: session.email,
      actorRole: session.role,
      targetEmail: parsed.data.targetUserEmail,
      plan: parsed.data.plan,
      period: parsed.data.period ?? null,
      reason: parsed.data.reason,
      requestId: parsed.data.requestId,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.error, tablesAvailable: result.error.tablesAvailable },
        { status: result.error.status },
      );
    }
    return NextResponse.json({
      success: true,
      replayed: result.replayed,
      subscription: result.subscription,
      creditsGranted: result.creditsGranted,
      auditStored: result.auditStored,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Package change failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
