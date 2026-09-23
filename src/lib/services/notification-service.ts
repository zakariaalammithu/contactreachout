import crypto from 'crypto';
import { AuthStore, UserAccount } from '@/lib/auth/auth-store';

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type RecipientScope = 'ALL_USERS' | 'SPECIFIC_USER' | 'ADMINS' | 'SUPER_ADMINS';

export interface AdminNotificationLog {
  id: string;
  recipientScope: RecipientScope;
  recipientUserId?: string | null;
  recipientUserEmail?: string | null;
  recipientUserName?: string | null;
  recipientCount: number;
  title: string;
  message: string;
  sentByUserId: string;
  sentByEmail: string;
  sentByName: string;
  sentAt: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string | null;
}

const userNotificationRecords = new Map<string, UserNotification[]>();
const historyLogs: AdminNotificationLog[] = [];

function ensureSeedHistory() {
  if (historyLogs.length === 0) {
    const defaultSuperAdminEmail = AuthStore.PRIMARY_SUPER_ADMIN_EMAIL || 'mithusquare@gmail.com';
    const defaultSuperAdmin = AuthStore.getUserByEmail(defaultSuperAdminEmail);

    historyLogs.push({
      id: 'notif_sys_seed_001',
      recipientScope: 'ALL_USERS',
      recipientCount: 5,
      title: 'Welcome to ContactReachout Platform',
      message: 'Your account is ready for automated contact form submissions and campaign dispatch.',
      sentByUserId: defaultSuperAdmin?.id || 'usr_super_admin',
      sentByEmail: defaultSuperAdminEmail,
      sentByName: defaultSuperAdmin?.name || 'Super Admin',
      sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: 'SENT',
    });
  }
}

export class NotificationService {
  public static list(userId: string): UserNotification[] {
    return [...(userNotificationRecords.get(userId) || [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  public static create(userId: string, title: string, message: string): UserNotification {
    const item: UserNotification = {
      id: crypto.randomUUID(),
      userId,
      title: title.trim(),
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    userNotificationRecords.set(userId, [item, ...(userNotificationRecords.get(userId) || [])]);
    return item;
  }

  public static markRead(userId: string, id: string): boolean {
    const items = userNotificationRecords.get(userId) || [];
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return false;
    item.read = true;
    return true;
  }

  public static dispatchNotification(params: {
    recipientScope: RecipientScope;
    recipientUserId?: string | null;
    title: string;
    message: string;
    sentBy: { id: string; email: string; name?: string };
  }): AdminNotificationLog {
    ensureSeedHistory();

    const { recipientScope, recipientUserId, title, message, sentBy } = params;

    let targetUsers: UserAccount[] = [];
    const allUsers = AuthStore.getAllUsers();

    if (recipientScope === 'ALL_USERS') {
      targetUsers = allUsers.filter((u) => u.role === 'USER');
      if (targetUsers.length === 0) targetUsers = allUsers;
    } else if (recipientScope === 'SPECIFIC_USER') {
      if (!recipientUserId) {
        throw new Error('Specific user ID must be selected.');
      }
      const singleUser = allUsers.find(
        (u) => u.id === recipientUserId || u.email === recipientUserId
      );
      if (!singleUser) {
        throw new Error('Recipient user not found.');
      }
      targetUsers = [singleUser];
    } else if (recipientScope === 'ADMINS') {
      targetUsers = allUsers.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
    } else if (recipientScope === 'SUPER_ADMINS') {
      targetUsers = allUsers.filter((u) => u.role === 'SUPER_ADMIN');
    }

    if (targetUsers.length === 0) {
      throw new Error('No valid recipients found for selected recipient criteria.');
    }

    // Deliver notification to each target user
    targetUsers.forEach((user) => {
      NotificationService.create(user.id, title, message);
    });

    const specificUser =
      recipientScope === 'SPECIFIC_USER' && targetUsers.length === 1 ? targetUsers[0] : null;

    const logItem: AdminNotificationLog = {
      id: `notif_log_${crypto.randomUUID().slice(0, 8)}`,
      recipientScope,
      recipientUserId: specificUser?.id || null,
      recipientUserEmail: specificUser?.email || null,
      recipientUserName: specificUser?.name || null,
      recipientCount: targetUsers.length,
      title: title.trim(),
      message: message.trim(),
      sentByUserId: sentBy.id,
      sentByEmail: sentBy.email,
      sentByName: sentBy.name || sentBy.email.split('@')[0],
      sentAt: new Date().toISOString(),
      status: 'SENT',
    };

    historyLogs.unshift(logItem);
    return logItem;
  }

  public static getHistoryLogs(): AdminNotificationLog[] {
    ensureSeedHistory();
    return [...historyLogs].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }

  public static deleteHistoryLog(id: string): boolean {
    ensureSeedHistory();
    const index = historyLogs.findIndex((log) => log.id === id);
    if (index === -1) return false;
    historyLogs.splice(index, 1);
    return true;
  }
}
