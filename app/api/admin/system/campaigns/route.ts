import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';

// Global system state
let globalLiveSubmissionsEnabled = false; // SAFETY DEFAULT: DISABLED

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    globalLiveSubmissionsEnabled,
    globalDailyLimit: 500,
    globalMaxConcurrency: 5,
    defaultInterPageDelayMs: 3000,
    defaultTimeoutMs: 30000,
    defaultSubmissionMode: 'manual_approval',
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { enableLiveSubmissions, globalDailyLimit, globalMaxConcurrency, defaultInterPageDelayMs } = body;

    if (enableLiveSubmissions !== undefined) {
      globalLiveSubmissionsEnabled = Boolean(enableLiveSubmissions);
    }

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: globalLiveSubmissionsEnabled ? 'global_live_submissions_enabled' : 'global_live_submissions_disabled',
      resourceType: 'system_settings',
      metadata: { globalLiveSubmissionsEnabled, globalDailyLimit, globalMaxConcurrency },
    });

    return NextResponse.json({
      success: true,
      globalLiveSubmissionsEnabled,
      message: `Global Live Submissions are now ${globalLiveSubmissionsEnabled ? 'ENABLED (LIVE OUTREACH ACTIVE)' : 'DISABLED (DRY-RUN ENFORCED)'}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update campaign settings.' }, { status: 500 });
  }
}
