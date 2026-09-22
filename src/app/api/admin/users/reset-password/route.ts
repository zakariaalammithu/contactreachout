import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const { email, newPassword } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
    }

    const targetUser = AuthStore.getUserByEmail(email);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Role check: ADMIN cannot reset password of SUPER_ADMIN
    if (session.role === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin users cannot reset passwords for Super Admin accounts.' },
        { status: 403 }
      );
    }

    if (newPassword && (typeof newPassword !== 'string' || newPassword.length < 12)) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters.' },
        { status: 400 }
      );
    }

    const result = AuthStore.resetPassword(email, newPassword);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'password_reset_initiated',
      resourceType: 'user',
      resourceId: targetUser.id,
      metadata: {
        targetEmail: targetUser.email,
        initiatedBy: session.email,
        timestamp: new Date().toISOString(),
        directReset: Boolean(newPassword),
      },
    });

    return NextResponse.json({
      success: true,
      message: newPassword
        ? `Password successfully updated for ${email}.`
        : `Password reset initiated for ${email}. Secure reset link generated.`,
      resetToken: result.resetToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initiate password reset.' },
      { status: 500 }
    );
  }
}
