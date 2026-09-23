import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'all';
  const resourceType = url.searchParams.get('resourceType') || 'all';
  const status = url.searchParams.get('status') || 'all';
  const actor = url.searchParams.get('actor') || 'all';
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  const result = AuditLogService.query({
    action,
    resourceType,
    status,
    actor,
    search,
    page,
    limit,
  });

  return NextResponse.json({
    logs: result.logs,
    totalLogs: result.totalLogs,
    page: result.page,
    totalPages: result.totalPages,
    limit: result.limit,
    timestamp: new Date().toISOString(),
  });
}

// Disallow POST/PUT/DELETE to ensure audit records remain server-side immutable
export async function POST() {
  return NextResponse.json({ error: 'Method Not Allowed. Audit logs are server-side immutable.' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed. Audit logs are server-side immutable.' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed. Audit logs are server-side immutable.' }, { status: 405 });
}
