import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { applySubscriptionDates } from '@/lib/services/admin-user-management';
import { z } from 'zod';

const datesSchema = z.object({
  targetUserEmail: z.string().email(),
  action: z.enum(['extend', 'set', 'expire', 'reactivate']),
  extendDays: z.number().int().positive().max(3650).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().trim().min(1).max(500),
  requestId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = datesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid date change.' }, { status: 400 });
  }

  try {
    const result = await applySubscriptionDates({
      actorEmail: session.email,
      actorRole: session.role,
      targetEmail: parsed.data.targetUserEmail,
      action: parsed.data.action,
      extendDays: parsed.data.extendDays,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
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
      auditStored: result.auditStored,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Date change failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
