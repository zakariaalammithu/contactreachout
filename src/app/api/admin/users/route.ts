import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard, type AppRole } from '@/lib/auth/admin-auth-guard';
import { AuthStore, type UserAccount } from '@/lib/auth/auth-store';
import { AuditLogService } from '@/lib/services/audit-log-service';

function countSuperAdmins(users: UserAccount[]): number {
  return users.filter((u) => u.role === 'SUPER_ADMIN' && !u.isSuspended).length;
}

function enrichUser(user: UserAccount) {
  const isAdminOrSuperAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  const freeMonthlyCredits = 100;
  const bonusCredits = user.bonusCredits || 0;
  const paidCredits = user.paidCredits || 0;
  
  // Available credits calculation using real backend rules
  const availableCredits = isAdminOrSuperAdmin
    ? 1000000
    : freeMonthlyCredits + bonusCredits + paidCredits;
  
  const usedCredits = 0; // Usage tracked per ledger
  const plan = user.plan || (isAdminOrSuperAdmin ? 'Enterprise / Admin' : 'Free');

  return {
    id: user.id,
    name: user.name || user.email.split('@')[0],
    email: user.email,
    company: user.company || '',
    avatarUrl: user.avatarUrl || null,
    role: user.role,
    isSuspended: user.isSuspended ?? false,
    isEmailVerified: user.isEmailVerified ?? false,
    plan,
    availableCredits,
    usedCredits,
    freeMonthlyCredits,
    purchasedCredits: paidCredits,
    bonusCredits,
    campaignsCount: 0,
    prospectsCount: 0,
    successfulSubmissions: 0,
    failedSubmissions: 0,
    noFormResults: 0,
    reviewResults: 0,
    repliesCount: 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null,
  };
}

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const roleFilter = url.searchParams.get('role') || 'all';
  const statusFilter = url.searchParams.get('status') || 'all';
  const verificationFilter = url.searchParams.get('verification') || 'all';
  const planFilter = url.searchParams.get('plan') || 'all';
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '25', 10)));

  let users = AuthStore.getAllUsers();

  // Search Filter: Name, Email, User ID, Company
  if (q) {
    users = users.filter((u) => {
      const nameMatch = (u.name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const idMatch = (u.id || '').toLowerCase().includes(q);
      const companyMatch = (u.company || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || idMatch || companyMatch;
    });
  }

  // Role Filter
  if (roleFilter !== 'all') {
    users = users.filter((u) => u.role === roleFilter);
  }

  // Status Filter
  if (statusFilter !== 'all') {
    if (statusFilter === 'ACTIVE') {
      users = users.filter((u) => !u.isSuspended);
    } else if (statusFilter === 'SUSPENDED') {
      users = users.filter((u) => u.isSuspended);
    }
  }

  // Email Verification Filter
  if (verificationFilter !== 'all') {
    if (verificationFilter === 'VERIFIED') {
      users = users.filter((u) => u.isEmailVerified);
    } else if (verificationFilter === 'UNVERIFIED') {
      users = users.filter((u) => !u.isEmailVerified);
    }
  }

  // Plan Filter
  if (planFilter !== 'all') {
    users = users.filter((u) => {
      const enrichedPlan = u.plan || (u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' ? 'Enterprise / Admin' : 'Free');
      if (planFilter === 'Free') return enrichedPlan.toLowerCase().includes('free');
      if (planFilter === 'Paid') return !enrichedPlan.toLowerCase().includes('free');
      return enrichedPlan.toLowerCase().includes(planFilter.toLowerCase());
    });
  }

  // Enriched mapping
  let enriched = users.map(enrichUser);

  // Sorting
  enriched.sort((a, b) => {
    let valA: any = a[sortBy as keyof typeof a] ?? '';
    let valB: any = b[sortBy as keyof typeof b] ?? '';

    if (sortBy === 'createdAt' || sortBy === 'lastLoginAt' || sortBy === 'updatedAt') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const total = enriched.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedUsers = enriched.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    users: paginatedUsers,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    currentUserEmail: session.email,
    currentUserRole: session.role,
    currentUserId: session.userId,
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const {
      email,
      name,
      company,
      role = 'USER',
      password,
      isEmailVerified = true,
      plan = 'Free',
      initialCredits = 0,
    } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    if (AuthStore.getUserByEmail(email)) {
      return NextResponse.json({ error: 'User with this email address already exists.' }, { status: 409 });
    }

    if (typeof password !== 'string' || password.length < 12) {
      return NextResponse.json(
        { error: 'Provide an initial password of at least 12 characters.' },
        { status: 400 }
      );
    }

    if (!['USER', 'ADMIN'].includes(role)) {
      // General UI creation only allows USER or ADMIN unless authorized Super Admin creation
      if (role === 'SUPER_ADMIN' && session.email !== AuthStore.PRIMARY_SUPER_ADMIN_EMAIL) {
        return NextResponse.json(
          { error: 'Only the primary Super Admin can provision new Super Admin accounts.' },
          { status: 403 }
        );
      }
    }

    const user = AuthStore.createUser({
      name: name || email.split('@')[0],
      email,
      password,
      role: role as AppRole,
      isEmailVerified: Boolean(isEmailVerified),
      company,
      plan,
    });

    if (initialCredits && Number.isInteger(initialCredits) && initialCredits > 0) {
      AuthStore.addPaidCredits(user.id, initialCredits);
    }

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'user_created',
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        targetEmail: user.email,
        assignedRole: user.role,
        isEmailVerified: user.isEmailVerified,
        plan,
        initialCredits,
        createdVia: 'Admin Console',
      },
    });

    return NextResponse.json({ success: true, user: enrichUser(user) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const reqBody = await req.json();
    const { email, role, isSuspended, isEmailVerified, plan, company, name, avatarUrl } = reqBody;

    if (!email) {
      return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
    }

    const targetUser = AuthStore.getUserByEmail(email);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Role boundary checks for ADMIN caller
    if (session.role === 'ADMIN') {
      if (targetUser.role === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Admins cannot modify Super Admin accounts.' },
          { status: 403 }
        );
      }
      if (role === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Admins cannot promote users to Super Admin.' },
          { status: 403 }
        );
      }
    }

    // Self-protection rules
    const isSelf = session.email.toLowerCase().trim() === targetUser.email.toLowerCase().trim() ||
                   session.userId === targetUser.id;

    if (isSelf) {
      if (role !== undefined && role !== targetUser.role) {
        return NextResponse.json(
          { error: 'You cannot change your own role.' },
          { status: 400 }
        );
      }
      if (isSuspended === true) {
        return NextResponse.json(
          { error: 'You cannot suspend your own account.' },
          { status: 400 }
        );
      }
    }

    // Primary Super Admin safeguards
    const isPrimarySuperAdmin = targetUser.email.toLowerCase().trim() === AuthStore.PRIMARY_SUPER_ADMIN_EMAIL;

    if (isPrimarySuperAdmin) {
      if (role !== undefined && role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Cannot demote the primary Super Admin account.' },
          { status: 400 }
        );
      }
      if (isSuspended === true) {
        return NextResponse.json(
          { error: 'Cannot suspend the primary Super Admin account.' },
          { status: 400 }
        );
      }
    }

    // Last Super Admin Safeguard
    const allUsers = AuthStore.getAllUsers();
    const currentSuperAdminCount = countSuperAdmins(allUsers);

    if (targetUser.role === 'SUPER_ADMIN') {
      if (role !== undefined && role !== 'SUPER_ADMIN' && currentSuperAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last remaining active Super Admin in the system.' },
          { status: 400 }
        );
      }
      if (isSuspended === true && currentSuperAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot suspend the last remaining active Super Admin in the system.' },
          { status: 400 }
        );
      }
    }

    const updates: Partial<UserAccount> = {};
    if (role !== undefined) {
      if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
      }
      updates.role = role as AppRole;
    }

    if (isSuspended !== undefined) {
      updates.isSuspended = Boolean(isSuspended);
    }
    if (isEmailVerified !== undefined) {
      updates.isEmailVerified = Boolean(isEmailVerified);
    }
    if (plan !== undefined) updates.plan = String(plan);
    if (company !== undefined) updates.company = String(company);
    if (name !== undefined) updates.name = String(name);
    if (reqBody.avatarUrl !== undefined) updates.avatarUrl = reqBody.avatarUrl ? String(reqBody.avatarUrl) : undefined;

    const updatedUser = AuthStore.updateUser(email, updates);

    // If account was suspended, invalidate all active user sessions
    if (updates.isSuspended === true) {
      AuthStore.deleteUserSessions(updatedUser.id);
      AuthStore.deleteUserSessions(updatedUser.email);
    }

    // Record audit log
    const actionName =
      updates.role !== undefined
        ? 'role_changed'
        : updates.isSuspended !== undefined
        ? updates.isSuspended
          ? 'user_suspended'
          : 'user_activated'
        : 'user_updated';

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: actionName as any,
      resourceType: 'user',
      resourceId: updatedUser.id,
      metadata: {
        targetEmail: email,
        updates,
        performedBy: session.email,
      },
    });

    return NextResponse.json({ success: true, user: enrichUser(updatedUser) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const { email, confirmEmail } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
    }

    if (confirmEmail && confirmEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Confirmation email does not match target user email.' },
        { status: 400 }
      );
    }

    const targetUser = AuthStore.getUserByEmail(email);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Self Protection
    const isSelf = session.email.toLowerCase().trim() === targetUser.email.toLowerCase().trim() ||
                   session.userId === targetUser.id;
    if (isSelf) {
      return NextResponse.json(
        { error: 'You cannot delete your own account.' },
        { status: 400 }
      );
    }

    // Primary Super Admin Protection
    if (targetUser.email.toLowerCase().trim() === AuthStore.PRIMARY_SUPER_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Cannot delete the primary Super Admin account.' },
        { status: 400 }
      );
    }

    // Last Super Admin Protection
    const allUsers = AuthStore.getAllUsers();
    if (targetUser.role === 'SUPER_ADMIN' && countSuperAdmins(allUsers) <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last remaining Super Admin in the system.' },
        { status: 400 }
      );
    }

    // Delete user sessions
    AuthStore.deleteUserSessions(targetUser.id);
    AuthStore.deleteUserSessions(targetUser.email);

    // Delete user from registry
    AuthStore.deleteUser(email);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'user_deleted',
      resourceType: 'user',
      resourceId: targetUser.id,
      metadata: {
        deletedEmail: email,
        deletedBy: session.email,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, message: `User ${email} deleted successfully.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user.' }, { status: 400 });
  }
}
