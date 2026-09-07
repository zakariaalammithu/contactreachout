import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { AuditLogService } from '@/lib/services/audit-log-service';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128)
    .regex(/[A-Z]/, 'New password must include an uppercase letter.')
    .regex(/[a-z]/, 'New password must include a lowercase letter.')
    .regex(/[0-9]/, 'New password must include a number.')
    .regex(/[^A-Za-z0-9]/, 'New password must include a special character.'),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match.',
  path: ['confirmPassword'],
});

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const parsed = passwordChangeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid password.' }, { status: 400 });
    }

    const account = AuthStore.getUserByEmail(session.email);
    if (!account?.passwordHash || !account.salt || !AuthStore.verifyPassword(parsed.data.currentPassword, account.passwordHash, account.salt)) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }
    if (AuthStore.verifyPassword(parsed.data.newPassword, account.passwordHash, account.salt)) {
      return NextResponse.json({ error: 'New password must be different from the current password.' }, { status: 400 });
    }

    const password = AuthStore.hashPassword(parsed.data.newPassword);
    AuthStore.updateUser(session.email, { passwordHash: password.hash, salt: password.salt });
    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'super_admin_password_changed',
      resourceType: 'admin_security',
      metadata: { accountEmail: session.email },
    });

    return NextResponse.json({ success: true, message: 'Admin password updated securely.' });
  } catch {
    return NextResponse.json({ error: 'Unable to update the password.' }, { status: 500 });
  }
}
