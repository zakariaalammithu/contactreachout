import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'all';
  const resourceType = url.searchParams.get('resourceType') || 'all';
  const status = url.searchParams.get('status') || 'all';
  const search = url.searchParams.get('search') || '';
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const logs = AuditLogService.query({
    action,
    resourceType,
    status,
    search,
    limit,
  });

  return NextResponse.json({
    logs,
    totalLogs: logs.length,
    timestamp: new Date().toISOString(),
  });
}
