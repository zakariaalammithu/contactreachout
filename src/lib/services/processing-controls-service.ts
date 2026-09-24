/**
 * Bulk Contact Form Outreach System — Safe Processing & Worker Controls Service
 * Manages worker concurrency, inter-job throttling, daily processing quotas,
 * conservative retry policies, and zero-evasion anti-bot access restriction halting.
 */

export interface SendingScheduleConfig {
  timezoneMode: 'account' | 'prospect' | 'custom';
  customTimezone: string;
  sendingDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  sendingHours: {
    enabled?: boolean;
    start: string; // e.g. "09:00"
    end: string;   // e.g. "17:00"
  };
  randomizeSubmissionTime: boolean;
}

export interface CampaignSafetyPacingConfig {
  isDryRun: boolean;
  rateLimitPerMinute: number;
  maxConcurrency: number;
  submissionDelaySeconds: number;
  dailySubmissionLimit: number;
  preventDuplicateSubmissions: boolean;
  retryFailedSubmissions: number;
  pauseAfterConsecutiveFailures: number;
  humanReviewUncertainForms: boolean;
  stopOnSecurityChallenge: boolean;
  schedule: SendingScheduleConfig;
}

export const CANONICAL_DEFAULT_SAFETY_CONFIG: CampaignSafetyPacingConfig = {
  isDryRun: true,
  rateLimitPerMinute: 10,
  maxConcurrency: 5,
  submissionDelaySeconds: 5,
  dailySubmissionLimit: 100,
  preventDuplicateSubmissions: true,
  retryFailedSubmissions: 1,
  pauseAfterConsecutiveFailures: 5,
  humanReviewUncertainForms: true,
  stopOnSecurityChallenge: true,
  schedule: {
    timezoneMode: 'account',
    customTimezone: 'America/New_York',
    sendingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    sendingHours: {
      enabled: false,
      start: '09:00',
      end: '17:00',
    },
    randomizeSubmissionTime: true,
  },
};

export interface SafeProcessingConfig {
  workerConcurrency: number;      // e.g., 5
  interJobDelayMs: number;        // e.g., 5000ms (5s delay)
  maxRetries: number;             // e.g., 1 retry
  jobTimeoutMs: number;           // e.g., 30000ms
  dailyProcessingLimit: number;   // e.g., 100 leads / day cap
  stopOnCaptcha: boolean;         // Always true
  stopOnAccessRestriction: boolean; // Always true
}

export const DEFAULT_SAFE_PROCESSING_CONFIG: SafeProcessingConfig = {
  workerConcurrency: 5,
  interJobDelayMs: 5000,
  maxRetries: 1,
  jobTimeoutMs: 30000,
  dailyProcessingLimit: 100,
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

export interface ScheduleCheckResult {
  isWithinWindow: boolean;
  reason?: string;
  targetTimezone: string;
  currentTimeInZone?: string;
  currentDay?: string;
}

/**
  * Helper to resolve prospect country or location string to a standard IANA timezone.
  */
export function resolveProspectTimezone(locationStr?: string | null): string {
  if (!locationStr) return 'America/New_York';
  const loc = locationStr.toLowerCase().trim();

  if (loc.includes('uk') || loc.includes('united kingdom') || loc.includes('london')) return 'Europe/London';
  if (loc.includes('germany') || loc.includes('berlin')) return 'Europe/Berlin';
  if (loc.includes('france') || loc.includes('paris')) return 'Europe/Paris';
  if (loc.includes('japan') || loc.includes('tokyo')) return 'Asia/Tokyo';
  if (loc.includes('india') || loc.includes('delhi') || loc.includes('mumbai')) return 'Asia/Kolkata';
  if (loc.includes('bangladesh') || loc.includes('dhaka')) return 'Asia/Dhaka';
  if (loc.includes('australia') || loc.includes('sydney')) return 'Australia/Sydney';
  if (loc.includes('canada') || loc.includes('toronto')) return 'America/Toronto';
  if (loc.includes('california') || loc.includes('los angeles') || loc.includes('san francisco')) return 'America/Los_Angeles';
  if (loc.includes('texas') || loc.includes('chicago') || loc.includes('illinois')) return 'America/Chicago';

  return 'America/New_York';
}

/**
 * Capitalizes string helper.
 */
function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Server-side Sending Schedule Validator
 */
export function validateSendingSchedule(
  schedule?: Partial<SendingScheduleConfig>,
  prospectLocation?: string
): ScheduleCheckResult {
  const mergedSchedule: SendingScheduleConfig = {
    ...CANONICAL_DEFAULT_SAFETY_CONFIG.schedule,
    ...(schedule || {}),
    sendingDays: {
      ...CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays,
      ...(schedule?.sendingDays || {}),
    },
    sendingHours: {
      ...CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours,
      ...(schedule?.sendingHours || {}),
    },
  };

  // 1. Determine target IANA timezone
  let targetTimezone = mergedSchedule.customTimezone || 'America/New_York';

  if (mergedSchedule.timezoneMode === 'account') {
    try {
      targetTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch {
      targetTimezone = 'America/New_York';
    }
  } else if (mergedSchedule.timezoneMode === 'prospect') {
    targetTimezone = resolveProspectTimezone(prospectLocation) || 'America/New_York';
  }

  // 2. Format current time in target timezone
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    let weekdayStr = '';
    let hourVal = 0;
    let minuteVal = 0;

    for (const p of parts) {
      if (p.type === 'weekday') weekdayStr = p.value.toLowerCase();
      if (p.type === 'hour') hourVal = parseInt(p.value, 10);
      if (p.type === 'minute') minuteVal = parseInt(p.value, 10);
    }

    // 3. Check Day
    const dayEnabled = (mergedSchedule.sendingDays as Record<string, boolean>)[weekdayStr] ?? false;
    if (!dayEnabled) {
      return {
        isWithinWindow: false,
        reason: `Scheduled — outside sending window (${capitalize(weekdayStr)} is disabled in campaign schedule).`,
        targetTimezone,
        currentDay: capitalize(weekdayStr),
      };
    }

    // 4. Check Hours (ONLY IF sendingHours restriction is enabled)
    if (mergedSchedule.sendingHours?.enabled) {
      const currentMinutes = hourVal * 60 + minuteVal;

      const [startH, startM] = (mergedSchedule.sendingHours.start || '09:00').split(':').map((v) => parseInt(v, 10));
      const [endH, endM] = (mergedSchedule.sendingHours.end || '17:00').split(':').map((v) => parseInt(v, 10));

      const startMinutes = (startH || 0) * 60 + (startM || 0);
      const endMinutes = (endH || 0) * 60 + (endM || 0);

      if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
        return {
          isWithinWindow: false,
          reason: `Scheduled — waiting for your configured sending hours (${mergedSchedule.sendingHours.start} - ${mergedSchedule.sendingHours.end} ${targetTimezone}).`,
          targetTimezone,
          currentTimeInZone: `${String(hourVal).padStart(2, '0')}:${String(minuteVal).padStart(2, '0')}`,
          currentDay: capitalize(weekdayStr),
        };
      }
    }

    return {
      isWithinWindow: true,
      targetTimezone,
      currentTimeInZone: `${String(hourVal).padStart(2, '0')}:${String(minuteVal).padStart(2, '0')}`,
      currentDay: capitalize(weekdayStr),
    };
  } catch (err: any) {
    return {
      isWithinWindow: true,
      targetTimezone: 'America/New_York',
      reason: `Timezone calculation fallback: ${err.message}`,
    };
  }
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
        reason: `Daily limit of ${dailyLimit} processed leads reached for today. Execution paused until next scheduled window.`,
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
