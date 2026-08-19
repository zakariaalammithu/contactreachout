import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AdminBootstrapService } from '@/lib/auth/admin-bootstrap';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const users = AdminBootstrapService.getAllUsers().map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    isSuspended: u.isSuspended,
    forcePasswordReset: u.forcePasswordReset,
    createdAt: u.createdAt,
  }));

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { email, role = 'USER', password } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const existing = AdminBootstrapService.getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
    }

    const { hash, salt } = AdminBootstrapService.hashPassword(password || 'TempPass#2026!');
    const newUser = {
      id: `usr-${Date.now()}`,
      email: email.toLowerCase().trim(),
      role: role as any,
      passwordHash: hash,
      salt,
      isSuspended: false,
      forcePasswordReset: true,
      createdAt: new Date().toISOString(),
    };

    AdminBootstrapService.updateUser(newUser.email, newUser);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'user_created',
      resourceType: 'user',
      resourceId: newUser.id,
      metadata: { targetEmail: newUser.email, assignedRole: newUser.role },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isSuspended: newUser.isSuspended,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create user.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { email, role, isSuspended, resetPassword } = body;

    if (!email) {
      return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (role !== undefined) {
      updates.role = role;
    }

    if (isSuspended !== undefined) {
      updates.isSuspended = Boolean(isSuspended);
    }

    if (resetPassword) {
      const { hash, salt } = AdminBootstrapService.hashPassword('ResetPass#2026!');
      updates.passwordHash = hash;
      updates.salt = salt;
      updates.forcePasswordReset = true;
    }

    AdminBootstrapService.updateUser(email, updates);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'user_updated',
      resourceType: 'user',
      resourceId: email,
      metadata: { targetEmail: email, updates: { role, isSuspended, passwordResetInitiated: Boolean(resetPassword) } },
    });

    return NextResponse.json({ success: true, message: `User ${email} successfully updated.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update user.' }, { status: 500 });
  }
}
