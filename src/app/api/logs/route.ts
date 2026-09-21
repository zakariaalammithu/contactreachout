import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { mockLogs } from '@/lib/store/mock-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = SessionManager.getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.role || 'USER';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || session.email.toLowerCase() === 'mithusquare@gmail.com';

  const url = new URL(req.url);
  const search = (url.searchParams.get('search') || '').toLowerCase().trim();
  const level = url.searchParams.get('level') || 'ALL';

  if (!isAdmin) {
    // Normal User: NEVER return system worker / internal debug / technical telemetry logs.
    // Return unauthorized for raw technical logs query.
    return NextResponse.json({
      authenticated: true,
      role: 'USER',
      isTechnicalLogsAuthorized: false,
      userEmail: session.email,
      logs: [],
      message: 'Technical system telemetry is restricted to Super Admin/Admin accounts.',
    });
  }

  // Super Admin / Admin: Return platform technical audit logs
  const filteredTechnicalLogs = mockLogs.filter((log) => {
    const matchesLevel = level === 'ALL' || log.level.toUpperCase() === level;
    const matchesSearch =
      !search ||
      log.traceId.toLowerCase().includes(search) ||
      log.message.toLowerCase().includes(search) ||
      (log.domain && log.domain.toLowerCase().includes(search));
    return matchesLevel && matchesSearch;
  });

  return NextResponse.json({
    authenticated: true,
    role: role,
    isTechnicalLogsAuthorized: true,
    userEmail: session.email,
    logs: filteredTechnicalLogs,
    totalLogs: filteredTechnicalLogs.length,
    timestamp: new Date().toISOString(),
  });
}
