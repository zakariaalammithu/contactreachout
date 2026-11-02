import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';
import { isSendingPaused, setSendingPaused } from '@/lib/services/killswitch';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    sendingPaused: isSendingPaused(),
    // Honest scope: this flag is the control plane. Enforcement inside
    // the campaign send path is wired separately.
    enforcement: 'flag-only',
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const paused = Boolean(body.paused);
    const current = setSendingPaused(paused);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: paused ? 'emergency_killswitch_activated' : 'emergency_killswitch_deactivated',
      resourceType: 'emergency_controls',
      metadata: { sendingPaused: current },
    });

    return NextResponse.json({
      success: true,
      sendingPaused: current,
      message: current
        ? 'Sending paused (flag set on this instance).'
        : 'Sending resumed (flag cleared on this instance).',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update killswitch.' }, { status: 500 });
  }
}
