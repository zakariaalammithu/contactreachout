import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { AuditLogService } from '@/lib/services/audit-log-service';
import { QueueManager } from '@/lib/queue/queue-manager';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const savedConcurrency = SecretManager.getSecret('BROWSER_CONCURRENCY');
    const savedTimeout = SecretManager.getSecret('BROWSER_NAV_TIMEOUT');
    const savedMode = SecretManager.getSecret('BROWSER_AUTOMATION_MODE');
    const savedSuccessScreenshot = SecretManager.getSecret('BROWSER_SCREENSHOT_SUCCESS');
    const savedFailureScreenshot = SecretManager.getSecret('BROWSER_SCREENSHOT_FAILURE');

    const mode = (
      savedMode ||
      process.env.CONTACT_FORM_MODE ||
      (process.env.NODE_ENV === 'production' ? 'live' : 'test')
    ).toLowerCase();

    const workerConcurrency = savedConcurrency ? parseInt(savedConcurrency, 10) : 5;
    const navigationTimeoutSeconds = savedTimeout ? parseInt(savedTimeout, 10) : 30;
    const screenshotOnSuccess = savedSuccessScreenshot ? savedSuccessScreenshot === 'true' : true;
    const screenshotOnFailure = savedFailureScreenshot ? savedFailureScreenshot === 'true' : true;

    return NextResponse.json({
      success: true,
      browserEnabled: mode !== 'disabled',
      workerConcurrency: Math.max(1, Math.min(20, workerConcurrency)),
      navigationTimeoutSeconds: Math.max(5, Math.min(120, navigationTimeoutSeconds)),
      jobTimeoutSeconds: navigationTimeoutSeconds * 2,
      retryLimit: 2,
      screenshotOnSuccess,
      screenshotOnFailure,
      mode: mode.toUpperCase(),
      zeroBypassEnforced: true,
      ssrfFirewallActive: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve browser automation config.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { workerConcurrency, navigationTimeoutSeconds, screenshotOnSuccess, screenshotOnFailure, mode } = body;

    // Server-side strict validation: Concurrency
    const concurrencyNum = Number(workerConcurrency);
    if (isNaN(concurrencyNum) || !Number.isInteger(concurrencyNum) || concurrencyNum < 1 || concurrencyNum > 20) {
      return NextResponse.json(
        { error: 'Max Browser Concurrency must be an integer between 1 and 20.' },
        { status: 400 }
      );
    }

    // Server-side strict validation: Navigation Timeout
    const timeoutNum = Number(navigationTimeoutSeconds);
    if (isNaN(timeoutNum) || !Number.isInteger(timeoutNum) || timeoutNum < 5 || timeoutNum > 120) {
      return NextResponse.json(
        { error: 'Navigation Timeout must be an integer between 5 and 120 seconds.' },
        { status: 400 }
      );
    }

    // Validate mode
    const cleanMode = (mode || 'test').toLowerCase().trim();
    if (!['test', 'live', 'disabled'].includes(cleanMode)) {
      return NextResponse.json(
        { error: 'Invalid execution mode: Must be TEST, LIVE, or DISABLED.' },
        { status: 400 }
      );
    }

    // Persist settings in SecretManager vault
    SecretManager.setSecret('BROWSER_CONCURRENCY', String(concurrencyNum), null, 'Browser Worker Concurrency');
    SecretManager.setSecret('BROWSER_NAV_TIMEOUT', String(timeoutNum), null, 'Browser Navigation Timeout');
    SecretManager.setSecret('BROWSER_AUTOMATION_MODE', cleanMode, null, 'Browser Automation Mode');
    SecretManager.setSecret('BROWSER_SCREENSHOT_SUCCESS', String(Boolean(screenshotOnSuccess)), null, 'Screenshot On Success');
    SecretManager.setSecret('BROWSER_SCREENSHOT_FAILURE', String(Boolean(screenshotOnFailure)), null, 'Screenshot On Failure');

    // Update QueueManager dynamic worker concurrency
    QueueManager.setConcurrency(concurrencyNum);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'browser_automation_settings_updated',
      resourceType: 'system_browser',
      metadata: { workerConcurrency: concurrencyNum, navigationTimeoutSeconds: timeoutNum, mode: cleanMode },
    });

    return NextResponse.json({
      success: true,
      message: 'Browser automation parameters updated and saved successfully.',
      mode: cleanMode.toUpperCase(),
      workerConcurrency: concurrencyNum,
      navigationTimeoutSeconds: timeoutNum,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update browser automation settings.' },
      { status: 500 }
    );
  }
}
