import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { QueueManager } from '@/lib/queue/queue-manager';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const stats = await QueueManager.getStatistics();
    const isPaused = stats.isPaused;

    return NextResponse.json({
      success: true,
      redisStatus: 'CONNECTED',
      brokerStatus: isPaused ? 'PAUSED' : 'ONLINE',
      queueStatus: isPaused ? 'PAUSED' : 'ONLINE',
      isPaused,
      workerConcurrency: stats.concurrency || 5,
      metrics: {
        active: stats.activeWorkers || stats.processing || 0,
        waiting: stats.queued || 0,
        completed: stats.completed || 0,
        failed: stats.failed || 0,
        reviewRequired: stats.reviewRequired || 0,
        delayed: 0,
      },
      registeredJobTypes: [
        'discover_contact_page',
        'detect_contact_form',
        'map_form_fields',
        'generate_preview',
        'submit_contact_form',
        'verify_submission',
      ],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve queue statistics.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { action, campaignId } = body;

    let resultMessage = 'Queue action processed successfully.';
    let isPaused = false;

    if (action === 'pause_queue') {
      await QueueManager.pauseQueue(campaignId);
      isPaused = true;
      resultMessage = campaignId
        ? `Queue dispatch paused for campaign "${campaignId}".`
        : 'All Queue Dispatchers paused globally.';
    } else if (action === 'resume_queue') {
      await QueueManager.resumeQueue(campaignId);
      isPaused = false;
      resultMessage = campaignId
        ? `Queue processing resumed for campaign "${campaignId}".`
        : 'Queue processing resumed globally.';
    } else if (action === 'retry_failed_jobs') {
      const count = await QueueManager.retryFailedJobs();
      resultMessage = count > 0
        ? `Re-queued ${count} failed job(s) for exponential retry.`
        : 'No failed jobs available for retry.';
    } else if (action === 'clear_completed') {
      const count = await QueueManager.clearCompletedTelemetry();
      resultMessage = `Cleared ${count} completed job record(s) from telemetry history.`;
    } else {
      return NextResponse.json(
        { error: `Unrecognized queue action "${action}".` },
        { status: 400 }
      );
    }

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: `queue_${action}`,
      resourceType: 'system_queue',
      metadata: { action, campaignId, isPaused },
    });

    const updatedStats = await QueueManager.getStatistics();

    return NextResponse.json({
      success: true,
      message: resultMessage,
      isPaused: updatedStats.isPaused,
      metrics: {
        active: updatedStats.activeWorkers || updatedStats.processing || 0,
        waiting: updatedStats.queued || 0,
        completed: updatedStats.completed || 0,
        failed: updatedStats.failed || 0,
        reviewRequired: updatedStats.reviewRequired || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process queue control action.' },
      { status: 500 }
    );
  }
}
