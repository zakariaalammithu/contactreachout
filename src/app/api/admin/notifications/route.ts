import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(request: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;
  const { target, userId, title, message } = await request.json();
  if (!title?.trim() || !message?.trim()) return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
  const recipients = target === 'all' ? AuthStore.getAllUsers().filter((user) => user.role === 'USER') : AuthStore.getAllUsers().filter((user) => user.id === userId);
  if (!recipients.length) return NextResponse.json({ error: 'Select a valid recipient.' }, { status: 400 });
  recipients.forEach((user) => NotificationService.create(user.id, title, message));
  return NextResponse.json({ success: true, recipients: recipients.length });
}
