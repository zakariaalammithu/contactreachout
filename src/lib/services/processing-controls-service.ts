/**
 * Bulk Contact Form Outreach System — Safe Processing & Worker Controls Service
 * Manages worker concurrency, inter-job throttling, daily processing quotas,
 * conservative retry policies, and zero-evasion anti-bot access restriction halting.
 */

export interface SafeProcessingConfig {
  workerConcurrency: number;      // e.g., 3 (Conservative default)
  interJobDelayMs: number;        // e.g., 3000ms (3s delay between submissions)
  maxRetries: number;             // e.g., 2 (Conservative, avoids aggressive retries)
  jobTimeoutMs: number;           // e.g., 30000ms (30s per stage)
  dailyProcessingLimit: number;   // e.g., 250 leads / day cap
  stopOnCaptcha: boolean;         // Always true (Zero bypass)
  stopOnAccessRestriction: boolean; // Always true (403/429 -> mark BLOCKED immediately)
}

export const DEFAULT_SAFE_PROCESSING_CONFIG: SafeProcessingConfig = {
  workerConcurrency: 3,           // Conservative default
  interJobDelayMs: 3000,          // 3 seconds between sites
  maxRetries: 2,                  // Max 2 retries
  jobTimeoutMs: 30000,            // 30 second timeout
  dailyProcessingLimit: 250,      // Safe daily limit
  stopOnCaptcha: true,
  stopOnAccessRestriction: true,
};

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  dailyLimit: number;
  remainingQuota: number;
  reason?: string;
}

// In-memory daily counter registry: `daily_usage_${campaignId}_${YYYY-MM-DD}`
const dailyUsageRegistry = new Map<string, number>();

export class SafeProcessingControlsService {
  /**
   * Generates a date-stamped usage key.
   */
  public static getDailyUsageKey(campaignId: string, dateStr: string = new Date().toISOString().split('T')[0]): string {
    return `daily_usage_${campaignId}_${dateStr}`;
  }

  /**
   * Verifies if a campaign has remaining daily processing quota.
   */
  public static checkDailyQuota(
    campaignId: string,
    dailyLimit: number = DEFAULT_SAFE_PROCESSING_CONFIG.dailyProcessingLimit
  ): QuotaCheckResult {
    const key = this.getDailyUsageKey(campaignId);
    const currentCount = dailyUsageRegistry.get(key) || 0;
    const remainingQuota = Math.max(0, dailyLimit - currentCount);

    if (currentCount >= dailyLimit) {
      return {
        allowed: false,
        currentCount,
        dailyLimit,
        remainingQuota: 0,
        reason: `Daily limit of ${dailyLimit} processed leads reached for today. Execution paused until midnight UTC.`,
      };
    }

    return {
      allowed: true,
      currentCount,
      dailyLimit,
      remainingQuota,
    };
  }

  /**
   * Increments daily processed count.
   */
  public static recordProcessedLead(campaignId: string): number {
    const key = this.getDailyUsageKey(campaignId);
    const current = dailyUsageRegistry.get(key) || 0;
    const next = current + 1;
    dailyUsageRegistry.set(key, next);
    return next;
  }

  /**
   * Evaluates HTTP status code or anti-bot response to determine halting action.
   * If a site returns 403, 429, CAPTCHA, or Cloudflare challenge:
   * Immediately halts processing, assigns REVIEW_REQUIRED or BLOCKED, and forbids retries.
   */
  public static evaluateAccessRestriction(statusCode: number | null, isCaptchaDetected: boolean): {
    shouldStop: boolean;
    assignedStatus: 'BLOCKED' | 'CAPTCHA' | 'REVIEW_REQUIRED' | 'PROCEED';
    shouldRetry: boolean;
    reason: string;
  } {
    if (isCaptchaDetected) {
      return {
        shouldStop: true,
        assignedStatus: 'CAPTCHA',
        shouldRetry: false,
        reason: 'CAPTCHA / Cloudflare Turnstile challenge detected. Zero-bypass policy enforced. Processing halted.',
      };
    }

    if (statusCode === 403) {
      return {
        shouldStop: true,
        assignedStatus: 'BLOCKED',
        shouldRetry: false,
        reason: 'HTTP 403 Forbidden (Access Denied / Bot Shield). Processing halted immediately.',
      };
    }

    if (statusCode === 429) {
      return {
        shouldStop: true,
        assignedStatus: 'BLOCKED',
        shouldRetry: false,
        reason: 'HTTP 429 Too Many Requests (Rate Limited). Processing halted to respect web server.',
      };
    }

    return {
      shouldStop: false,
      assignedStatus: 'PROCEED',
      shouldRetry: false,
      reason: 'No access restrictions detected. Safe to proceed.',
    };
  }

  /**
   * Clears daily quota records (for test fixtures).
   */
  public static clearDailyCounters(): void {
    dailyUsageRegistry.clear();
  }
}
