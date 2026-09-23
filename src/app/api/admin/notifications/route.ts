import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { NotificationService, RecipientScope } from '@/lib/services/notification-service';

export async function GET(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.toLowerCase().trim() || '';
  const scopeFilter = url.searchParams.get('scope') || 'ALL';
  const statusFilter = url.searchParams.get('status') || 'ALL';
  const dateFilter = url.searchParams.get('dateRange') || 'ALL';

  let logs = NotificationService.getHistoryLogs();

  // Search filter
  if (search) {
    logs = logs.filter(
      (log) =>
        log.title.toLowerCase().includes(search) ||
        log.message.toLowerCase().includes(search) ||
        (log.recipientUserEmail && log.recipientUserEmail.toLowerCase().includes(search)) ||
        (log.recipientUserName && log.recipientUserName.toLowerCase().includes(search)) ||
        log.sentByEmail.toLowerCase().includes(search)
    );
  }

  // Scope filter
  if (scopeFilter !== 'ALL') {
    logs = logs.filter((log) => log.recipientScope === scopeFilter);
  }

  // Status filter
  if (statusFilter !== 'ALL') {
    logs = logs.filter((log) => log.status === statusFilter);
  }

  // Date range filter
  if (dateFilter !== 'ALL') {
    const now = Date.now();
    const oneDay = 86400000;
    logs = logs.filter((log) => {
      const logTime = new Date(log.sentAt).getTime();
      if (dateFilter === 'today') return now - logTime <= oneDay;
      if (dateFilter === '7days') return now - logTime <= oneDay * 7;
      if (dateFilter === '30days') return now - logTime <= oneDay * 30;
      return true;
    });
  }

  return NextResponse.json({
    success: true,
    history: logs,
    total: logs.length,
  });
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { target, userId, title, message } = body;

    let recipientScope: RecipientScope = body.recipientScope;
    let recipientUserId: string | undefined = body.recipientUserId;

    // Backward compatibility for simple target parameter
    if (!recipientScope) {
      if (target === 'all' || target === 'ALL_USERS') {
        recipientScope = 'ALL_USERS';
      } else if (target === 'ADMINS') {
        recipientScope = 'ADMINS';
      } else if (target === 'SUPER_ADMINS') {
        recipientScope = 'SUPER_ADMINS';
      } else {
        recipientScope = 'SPECIFIC_USER';
        recipientUserId = target || userId;
      }
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Notification title is required.' }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Notification message is required.' }, { status: 400 });
    }

    if (recipientScope === 'SPECIFIC_USER' && !recipientUserId) {
      return NextResponse.json(
        { error: 'Please select a specific user recipient.' },
        { status: 400 }
      );
    }

    const senderUser = session?.email ? AuthStore.getUserByEmail(session.email) : null;

    const logItem = NotificationService.dispatchNotification({
      recipientScope,
      recipientUserId,
      title: title.trim(),
      message: message.trim(),
      sentBy: {
        id: session?.userId || 'usr_admin',
        email: session?.email || 'admin@contactreachout.com',
        name: senderUser?.name || session?.email?.split('@')[0] || 'Admin Operator',
      },
    });

    return NextResponse.json({
      success: true,
      log: logItem,
      recipients: logItem.recipientCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch notification.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
