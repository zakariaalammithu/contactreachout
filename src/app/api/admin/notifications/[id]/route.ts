import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { NotificationService } from '@/lib/services/notification-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'History ID is required.' }, { status: 400 });
  }

  const success = NotificationService.deleteHistoryLog(id);
  if (!success) {
    return NextResponse.json({ error: 'Notification history record not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'History record deleted.' });
}
