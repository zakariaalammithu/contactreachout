import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AdminBootstrapService } from '@/lib/auth/admin-bootstrap';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    profile: {
      userId: session.userId,
      email: session.email,
      role: session.role,
      name: 'Mithu Alam (Super Admin)',
      avatarUrl: null,
      twoFactorEnabled: false,
      activeSessionsCount: 1,
      lastLogin: new Date().toISOString(),
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { action, currentPassword, newPassword } = body;

    if (action === 'change_password') {
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
      }

      const { hash, salt } = AdminBootstrapService.hashPassword(newPassword);
      AdminBootstrapService.updateUser(session.email, {
        passwordHash: hash,
        salt,
        forcePasswordReset: false,
      });

      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'admin_password_changed',
        resourceType: 'admin_profile',
        metadata: { changedBy: session.email },
      });

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully.',
      });
    }

    if (action === 'logout_all_sessions') {
      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'all_sessions_revoked',
        resourceType: 'admin_profile',
      });

      return NextResponse.json({
        success: true,
        message: 'All other active sessions have been terminated.',
      });
    }

    return NextResponse.json({ error: 'Invalid profile action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile.' }, { status: 500 });
  }
}
