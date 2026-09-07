import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard, type AppRole } from '@/lib/auth/admin-auth-guard';
import { AuthStore, type UserAccount } from '@/lib/auth/auth-store';
import { AuditLogService } from '@/lib/services/audit-log-service';

const publicUser = (user: UserAccount) => ({ id: user.id, name: user.name, email: user.email, role: user.role, isSuspended: user.isSuspended, isEmailVerified: user.isEmailVerified, createdAt: user.createdAt, updatedAt: user.updatedAt });

export async function GET(req: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;
  return NextResponse.json({ users: AuthStore.getAllUsers().map(publicUser) });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;
  try {
    const { email, name, role = 'USER', password } = await req.json();
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    if (AuthStore.getUserByEmail(email)) return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 });
    if (typeof password !== 'string' || password.length < 12) return NextResponse.json({ error: 'Provide an initial password of at least 12 characters.' }, { status: 400 });
    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    const user = AuthStore.createUser({ name: name || email.split('@')[0], email, password, role: role as AppRole, isEmailVerified: true });
    AuditLogService.log({ userId: session.userId, userEmail: session.email, action: 'user_created', resourceType: 'user', resourceId: user.id, metadata: { targetEmail: user.email, assignedRole: user.role } });
    return NextResponse.json({ success: true, user: publicUser(user) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;
  try {
    const { email, role, isSuspended } = await req.json();
    if (!email) return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
    const updates: { role?: AppRole; isSuspended?: boolean } = {};
    if (role !== undefined) {
      if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
      updates.role = role;
    }
    if (isSuspended !== undefined) updates.isSuspended = Boolean(isSuspended);
    const user = AuthStore.updateUser(email, updates);
    AuditLogService.log({ userId: session.userId, userEmail: session.email, action: 'user_updated', resourceType: 'user', resourceId: user.id, metadata: { targetEmail: email, updates } });
    return NextResponse.json({ success: true, user: publicUser(user) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
    if (!AuthStore.deleteUser(email)) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    AuditLogService.log({ userId: session.userId, userEmail: session.email, action: 'user_deleted', resourceType: 'user', resourceId: email });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user.' }, { status: 400 });
  }
}
