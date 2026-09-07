import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const notifications = NotificationService.list(session.userId);
  return NextResponse.json({ notifications, unread: notifications.filter((item) => !item.read).length });
}

export async function PATCH(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await request.json();
  if (!NotificationService.markRead(session.userId, String(id || ''))) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
