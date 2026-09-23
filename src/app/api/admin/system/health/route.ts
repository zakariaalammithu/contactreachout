import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SystemHealthService } from '@/lib/services/system-health-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    // 5-second timeout for diagnostic probes
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Diagnostic probe timeout')), 5000)
    );
    const diagnosticsPromise = SystemHealthService.runDiagnostics();

    const result = await Promise.race([diagnosticsPromise, timeoutPromise]);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        overallStatus: 'YELLOW',
        totalComponents: 10,
        healthyCount: 0,
        warningCount: 1,
        errorCount: 0,
        notConfiguredCount: 0,
        components: [],
        timestamp: new Date().toISOString(),
        error: err?.message || 'Health probe error',
      },
      { status: 500 }
    );
  }
}
