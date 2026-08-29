/**
 * Bulk Contact Form Outreach System — BullMQ & Redis Configuration
 * Provides connection parameters, default worker limits, and exponential backoff policies.
 */

export const QUEUE_NAME = 'outreach-submission-queue';

export const REDIS_CONNECTION_CONFIG = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000, // 3s, 6s, 12s
  },
  timeout: 30000, // 30s timeout per job
  removeOnComplete: {
    age: 3600 * 24, // Keep for 24h
    count: 1000,
  },
  removeOnFail: {
    age: 3600 * 72, // Keep failed for 72h
    count: 5000,
  },
};

// Conservative default worker concurrency to prevent overwhelming websites
export const DEFAULT_WORKER_CONCURRENCY = Number(process.env.MAX_WORKER_CONCURRENCY) || 3;
