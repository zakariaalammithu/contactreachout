import crypto from 'crypto';

export interface UserNotification { id: string; userId: string; title: string; message: string; read: boolean; createdAt: string }
const records = new Map<string, UserNotification[]>();

export class NotificationService {
  static list(userId: string) { return [...(records.get(userId) || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  static create(userId: string, title: string, message: string) {
    const item: UserNotification = { id: crypto.randomUUID(), userId, title: title.trim(), message: message.trim(), read: false, createdAt: new Date().toISOString() };
    records.set(userId, [item, ...(records.get(userId) || [])]);
    return item;
  }
  static markRead(userId: string, id: string) {
    const item = (records.get(userId) || []).find((candidate) => candidate.id === id);
    if (!item) return false;
    item.read = true;
    return true;
  }
}
