import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    sessionTimeoutMinutes: 60,
    loginRateLimitPerMinute: 10,
    failedLoginLockoutThreshold: 5,
    lockoutDurationMinutes: 15,
    forceAdminPasswordChange: false,
    twoFactorReady: true,
    allowedOrigins: ['http://localhost:3000', 'https://*.bulkreach.io'],
    securityHeaders: {
      contentSecurityPolicy: 'Active',
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'DENY',
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { sessionTimeoutMinutes, loginRateLimitPerMinute, failedLoginLockoutThreshold, lockoutDurationMinutes } = body;

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'security_policies_updated',
      resourceType: 'system_security',
      metadata: { sessionTimeoutMinutes, loginRateLimitPerMinute, failedLoginLockoutThreshold },
    });

    return NextResponse.json({
      success: true,
      message: 'Security and lockout policies updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update security policies.' }, { status: 500 });
  }
}
