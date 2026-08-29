/**
 * Bulk Contact Form Outreach System — Queue Management Engine
 * Orchestrates job scheduling, idempotency hashing, campaign pause/resume,
 * and live queue metrics aggregation.
 */

import { OutreachJobPayload, OutreachJobType, QueueStatistics } from './job-types';
import { DEFAULT_JOB_OPTIONS, DEFAULT_WORKER_CONCURRENCY } from './bullmq-config';

// In-memory queue store representing background job states
export interface EnqueuedJobItem {
  id: string;
  name: OutreachJobType;
  data: OutreachJobPayload;
  progress: number;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'review_required';
  attemptsMade: number;
  maxAttempts: number;
  failedReason?: string;
  timestamp: string;
  processedOn?: string;
  finishedOn?: string;
}

export class QueueManager {
  private static jobsMap = new Map<string, EnqueuedJobItem>();
  private static isQueuePaused = false;
  private static concurrency = DEFAULT_WORKER_CONCURRENCY;

  /**
   * Generates a unique, deterministic job ID for idempotency protection.
   */
  public static generateJobId(campaignId: string, leadId: string, jobType: OutreachJobType): string {
    return `job_${campaignId}_${leadId}_${jobType}`;
  }

  /**
   * Schedules a new outreach job with duplicate protection.
   */
  public static async enqueueJob(payload: OutreachJobPayload): Promise<{ enqueued: boolean; jobId: string; reason?: string }> {
    const jobId = this.generateJobId(payload.campaignId, payload.leadId, payload.jobType);

    // Idempotency: Check if job already exists
    if (this.jobsMap.has(jobId)) {
      const existing = this.jobsMap.get(jobId)!;
      if (existing.status === 'completed' || existing.status === 'active' || existing.status === 'waiting') {
        return {
          enqueued: false,
          jobId,
          reason: `Idempotent duplicate: Job ${jobId} is already in state "${existing.status}".`,
        };
      }
    }

    const jobItem: EnqueuedJobItem = {
      id: jobId,
      name: payload.jobType,
      data: payload,
      progress: 0,
      status: 'waiting',
      attemptsMade: 0,
      maxAttempts: DEFAULT_JOB_OPTIONS.attempts,
      timestamp: new Date().toISOString(),
    };

    this.jobsMap.set(jobId, jobItem);
    return { enqueued: true, jobId };
  }

  /**
   * Retrieves aggregated queue statistics.
   */
  public static async getStatistics(campaignId?: string): Promise<QueueStatistics> {
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let reviewRequired = 0;

    for (const job of this.jobsMap.values()) {
      if (campaignId && job.data.campaignId !== campaignId) continue;

      switch (job.status) {
        case 'waiting':
        case 'delayed':
          queued++;
          break;
        case 'active':
          processing++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'review_required':
          reviewRequired++;
          break;
      }
    }

    return {
      queued,
      processing,
      completed,
      failed,
      reviewRequired,
      activeWorkers: processing,
      concurrency: this.concurrency,
      isPaused: this.isQueuePaused,
    };
  }

  /**
   * Pauses queue processing globally or for a specific campaign.
   */
  public static async pauseQueue(campaignId?: string): Promise<boolean> {
    if (campaignId) {
      for (const job of this.jobsMap.values()) {
        if (job.data.campaignId === campaignId && job.status === 'waiting') {
          job.status = 'delayed';
        }
      }
    } else {
      this.isQueuePaused = true;
    }
    return true;
  }

  /**
   * Resumes queue processing.
   */
  public static async resumeQueue(campaignId?: string): Promise<boolean> {
    if (campaignId) {
      for (const job of this.jobsMap.values()) {
        if (job.data.campaignId === campaignId && job.status === 'delayed') {
          job.status = 'waiting';
        }
      }
    } else {
      this.isQueuePaused = false;
    }
    return true;
  }

  /**
   * Cancels all pending jobs for a specific campaign.
   */
  public static async cancelCampaign(campaignId: string): Promise<number> {
    let cancelledCount = 0;
    for (const [id, job] of this.jobsMap.entries()) {
      if (job.data.campaignId === campaignId && (job.status === 'waiting' || job.status === 'delayed')) {
        this.jobsMap.delete(id);
        cancelledCount++;
      }
    }
    return cancelledCount;
  }

  /**
   * Pauses a specific lead.
   */
  public static async pauseLead(leadId: string): Promise<boolean> {
    for (const job of this.jobsMap.values()) {
      if (job.data.leadId === leadId && job.status === 'waiting') {
        job.status = 'delayed';
      }
    }
    return true;
  }

  /**
   * Sets dynamic concurrency limit.
   */
  public static setConcurrency(threads: number): void {
    if (threads > 0 && threads <= 20) {
      this.concurrency = threads;
    }
  }

  /**
   * Updates job status and progress.
   */
  public static updateJobState(
    jobId: string,
    updates: Partial<EnqueuedJobItem>
  ): void {
    const job = this.jobsMap.get(jobId);
    if (job) {
      Object.assign(job, updates);
    }
  }

  /**
   * Clears all jobs (for test fixtures).
   */
  public static clear(): void {
    this.jobsMap.clear();
    this.isQueuePaused = false;
  }
}
