import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SystemHealthService } from '@/lib/services/system-health-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const diagnostics = await SystemHealthService.runDiagnostics();
  return NextResponse.json(diagnostics);
}
