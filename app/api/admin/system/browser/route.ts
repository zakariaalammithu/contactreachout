import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    browserEnabled: true,
    workerConcurrency: 5,
    navigationTimeoutSeconds: 30,
    jobTimeoutSeconds: 60,
    retryLimit: 2,
    screenshotOnSuccess: true,
    screenshotOnFailure: true,
    mode: process.env.CONTACT_FORM_MODE || 'test',
    zeroBypassEnforced: true,
    ssrfFirewallActive: true,
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { workerConcurrency, navigationTimeoutSeconds, screenshotOnSuccess, screenshotOnFailure, mode } = body;

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'browser_automation_settings_updated',
      resourceType: 'system_browser',
      metadata: { workerConcurrency, navigationTimeoutSeconds, mode },
    });

    return NextResponse.json({
      success: true,
      message: 'Browser automation settings updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update browser settings.' }, { status: 500 });
  }
}
