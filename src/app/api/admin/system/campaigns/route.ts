import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { AuditLogService } from '@/lib/services/audit-log-service';
import { QueueManager } from '@/lib/queue/queue-manager';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const savedLiveMode = SecretManager.getSecret('LIVE_OUTBOUND_ENABLED');
    const savedDailyQuota = SecretManager.getSecret('GLOBAL_DAILY_QUOTA');
    const savedConcurrency = SecretManager.getSecret('GLOBAL_MAX_CONCURRENCY');
    const savedDelay = SecretManager.getSecret('INTER_PAGE_DELAY_MS');

    const globalLiveSubmissionsEnabled = savedLiveMode ? savedLiveMode === 'true' : false; // SAFETY DEFAULT: FALSE (DRY-RUN)
    const globalDailyLimit = savedDailyQuota ? parseInt(savedDailyQuota, 10) : 500;
    const globalMaxConcurrency = savedConcurrency ? parseInt(savedConcurrency, 10) : 5;
    const defaultInterPageDelayMs = savedDelay ? parseInt(savedDelay, 10) : 3000;

    return NextResponse.json({
      success: true,
      globalLiveSubmissionsEnabled,
      globalDailyLimit: Math.max(1, Math.min(100000, globalDailyLimit)),
      globalMaxConcurrency: Math.max(1, Math.min(20, globalMaxConcurrency)),
      defaultInterPageDelayMs: Math.max(500, Math.min(30000, defaultInterPageDelayMs)),
      defaultTimeoutMs: 30000,
      defaultSubmissionMode: 'manual_approval',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve campaign settings.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { enableLiveSubmissions, globalDailyLimit, globalMaxConcurrency, defaultInterPageDelayMs } = body;

    // Server-side strict validation: Daily Quota
    const quotaNum = Number(globalDailyLimit);
    if (isNaN(quotaNum) || !Number.isInteger(quotaNum) || quotaNum < 1 || quotaNum > 100000) {
      return NextResponse.json(
        { error: 'Global Daily Quota Cap must be an integer between 1 and 100,000 leads per day.' },
        { status: 400 }
      );
    }

    // Server-side strict validation: Concurrency
    const concurrencyNum = Number(globalMaxConcurrency);
    if (isNaN(concurrencyNum) || !Number.isInteger(concurrencyNum) || concurrencyNum < 1 || concurrencyNum > 20) {
      return NextResponse.json(
        { error: 'Global Max Concurrency must be an integer between 1 and 20 workers.' },
        { status: 400 }
      );
    }

    // Server-side strict validation: Delay
    const delayNum = Number(defaultInterPageDelayMs);
    if (isNaN(delayNum) || !Number.isInteger(delayNum) || delayNum < 500 || delayNum > 30000) {
      return NextResponse.json(
        { error: 'Inter-Page Delay must be an integer between 500ms and 30,000ms.' },
        { status: 400 }
      );
    }

    const liveEnabledState = Boolean(enableLiveSubmissions);

    // Save in SecretManager vault
    SecretManager.setSecret('LIVE_OUTBOUND_ENABLED', String(liveEnabledState), null, 'Live Outbound Enabled Flag');
    SecretManager.setSecret('GLOBAL_DAILY_QUOTA', String(quotaNum), null, 'Global Daily Quota Cap');
    SecretManager.setSecret('GLOBAL_MAX_CONCURRENCY', String(concurrencyNum), null, 'Global Max Concurrency');
    SecretManager.setSecret('INTER_PAGE_DELAY_MS', String(delayNum), null, 'Inter-Page Navigation Delay');

    // Sync with QueueManager dynamic concurrency
    QueueManager.setConcurrency(concurrencyNum);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: liveEnabledState ? 'global_live_submissions_enabled' : 'global_live_submissions_disabled',
      resourceType: 'system_settings',
      metadata: { globalLiveSubmissionsEnabled: liveEnabledState, globalDailyLimit: quotaNum, globalMaxConcurrency: concurrencyNum, defaultInterPageDelayMs: delayNum },
    });

    return NextResponse.json({
      success: true,
      globalLiveSubmissionsEnabled: liveEnabledState,
      globalDailyLimit: quotaNum,
      globalMaxConcurrency: concurrencyNum,
      defaultInterPageDelayMs: delayNum,
      message: `Global campaign policies updated. Live Submissions are now ${liveEnabledState ? 'ENABLED (LIVE OUTREACH ACTIVE)' : 'DISABLED (SAFE DRY-RUN ENFORCED)'}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update campaign settings.' },
      { status: 500 }
    );
  }
}
