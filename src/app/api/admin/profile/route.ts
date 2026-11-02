

import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AdminBootstrapService } from '@/lib/auth/admin-bootstrap';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    profile: {
      userId: session.userId,
      email: session.email,
      role: session.role,
      name: 'Ethan Carter (Super Admin)',
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
      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
      }
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
      }
      if (newPassword === currentPassword) {
        return NextResponse.json({ error: 'New password must be different from the current password.' }, { status: 400 });
      }

      // Verify the current password before changing anything. Sign-in
      // checks the AuthStore record, so that is the live credential;
      // the bootstrap record is checked as a fallback and kept in sync.
      const authAccount = AuthStore.getUserByEmail(session.email);
      const bootstrapAccount = AdminBootstrapService.getUserByEmail(session.email);
      const authVerified = Boolean(
        authAccount?.passwordHash && authAccount.salt &&
        AuthStore.verifyPassword(currentPassword, authAccount.passwordHash, authAccount.salt),
      );
      const bootstrapVerified = !authVerified && Boolean(
        bootstrapAccount &&
        AdminBootstrapService.verifyPassword(currentPassword, bootstrapAccount.passwordHash, bootstrapAccount.salt),
      );
      if (!authVerified && !bootstrapVerified) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      const { hash, salt } = AuthStore.hashPassword(newPassword);
      if (authAccount) {
        AuthStore.updateUser(session.email, { passwordHash: hash, salt });
      }
      if (bootstrapAccount) {
        AdminBootstrapService.updateUser(session.email, {
          passwordHash: hash,
          salt,
          forcePasswordReset: false,
        });
      }

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
      // Real revocation: every other session's token predates the new
      // epoch and is rejected by AuthStore.getSession. The current
      // browser is re-issued a fresh token so it stays logged in.
      const rawToken =
        req.cookies.get(SessionManager.COOKIE_NAME)?.value ||
        (req.headers.get('Authorization')?.startsWith('Bearer ')
          ? req.headers.get('Authorization')!.substring(7)
          : '');
      const { freshToken, expiresAt } = AuthStore.revokeAllOtherSessionsForToken(session.email, rawToken);

      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'all_sessions_revoked',
        resourceType: 'admin_profile',
      });

      const res = NextResponse.json({
        success: true,
        message: 'All other active sessions have been terminated.',
      });
      if (freshToken && expiresAt) {
        res.cookies.set({
          name: SessionManager.COOKIE_NAME,
          value: freshToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          expires: new Date(expiresAt),
        });
      }
      return res;
    }

    return NextResponse.json({ error: 'Invalid profile action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile.' }, { status: 500 });
  }
}
