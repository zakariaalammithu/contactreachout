import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';
import { getAdminSetting, setAdminSetting } from '@/lib/services/admin-settings-service';

const DEFAULTS = {
  sessionTimeoutMinutes: 60,
  loginRateLimitPerMinute: 10,
  failedLoginLockoutThreshold: 5,
  lockoutDurationMinutes: 15,
};

function asPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const stored = await getAdminSetting<typeof DEFAULTS>('security.policies');
  const policies = stored.available && stored.value
    ? {
        sessionTimeoutMinutes: asPositiveInt(stored.value.sessionTimeoutMinutes, DEFAULTS.sessionTimeoutMinutes),
        loginRateLimitPerMinute: asPositiveInt(stored.value.loginRateLimitPerMinute, DEFAULTS.loginRateLimitPerMinute),
        failedLoginLockoutThreshold: asPositiveInt(stored.value.failedLoginLockoutThreshold, DEFAULTS.failedLoginLockoutThreshold),
        lockoutDurationMinutes: asPositiveInt(stored.value.lockoutDurationMinutes, DEFAULTS.lockoutDurationMinutes),
      }
    : DEFAULTS;

  return NextResponse.json({
    ...policies,
    // Honest durability flag: false until migration 20261102000005 is
    // applied and the table answers. The page shows a warning then.
    durable: stored.available,
    durableError: stored.available ? undefined : stored.error,
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
    const policies = {
      sessionTimeoutMinutes: asPositiveInt(body.sessionTimeoutMinutes, DEFAULTS.sessionTimeoutMinutes),
      loginRateLimitPerMinute: asPositiveInt(body.loginRateLimitPerMinute, DEFAULTS.loginRateLimitPerMinute),
      failedLoginLockoutThreshold: asPositiveInt(body.failedLoginLockoutThreshold, DEFAULTS.failedLoginLockoutThreshold),
      lockoutDurationMinutes: asPositiveInt(body.lockoutDurationMinutes, DEFAULTS.lockoutDurationMinutes),
    };

    // Fail closed: never claim a save that did not persist. Until the
    // admin_settings table exists, this returns 503 with the reason.
    const saved = await setAdminSetting('security.policies', policies);
    if (!saved.ok) {
      return NextResponse.json(
        { error: saved.error || 'Security policies could not be saved.' },
        { status: 503 },
      );
    }

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'security_policies_updated',
      resourceType: 'system_security',
      metadata: { ...policies },
    });

    return NextResponse.json({
      success: true,
      durable: true,
      ...policies,
      message: 'Security policies saved durably.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update security policies.' }, { status: 500 });
  }
}
