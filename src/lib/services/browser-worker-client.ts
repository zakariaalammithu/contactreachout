import { createHash } from 'node:crypto';
import type { FieldMappingAssignment } from './field-mapper';
import type { SubmissionExecutionResult } from './form-submitter';

const WORKER_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 2;

// NOTE: the app no longer gates submissions on BROWSER_WORKER_ALLOWED_DOMAINS.
// The worker itself enforces authorization (its static allow-list, plus
// dynamic campaign-lead verification via /api/worker/verify-domain), so a
// target outside the static list still reaches the worker instead of
// failing fast here. Removing this gate is what makes bulk outreach to new
// domains work without an env edit or redeploy.
function unavailable(message: string, fieldsFilledCount: number, startedAt: number): SubmissionExecutionResult {
  return {
    status: 'FAILED', isDryRun: false, isTestMode: false, httpStatus: null,
    fieldsFilledCount, honeypotsNeutralizedCount: 0, successVerified: false, submitAttempted: false,
    executionDurationMs: Date.now() - startedAt, submittedAt: new Date().toISOString(),
    diagnosticCode: 'BROWSER_RUNTIME_UNAVAILABLE', errorMessage: message,
  };
}

export interface WorkerDetectionField {
  selector: string;
  name: string;
  tag: string;
  type: string;
  required: boolean;
  label: string;
  options?: Array<{ label: string; value: string }>;
}

export interface WorkerDetectionForm {
  selector: string;
  action: string;
  method: string;
  fields: WorkerDetectionField[];
}

export type WorkerDetectionOutcome =
  | { available: true; status: 'DETECTED' | 'NOT_FOUND' | 'CAPTCHA_DETECTED' | 'NAVIGATION_FAILED'; forms: WorkerDetectionForm[]; errorMessage?: string }
  | { available: false; reason: string };

export function isBrowserWorkerConfigured(): boolean {
  return Boolean(process.env.BROWSER_WORKER_URL && process.env.BROWSER_WORKER_AUTH_SECRET);
}

function workerDetectUrl(): string | null {
  const base = (process.env.BROWSER_WORKER_URL || '').replace(/\/submit\/?$/, '');
  return base ? `${base}/detect` : null;
}

/**
 * Ask the remote worker (which has a real Chromium) to render a page and
 * report its forms. This is the only detection path that works for
 * client-rendered (JS) pages; the app's fetch-based detection cannot see
 * them. Returns available:false when the worker is not configured or
 * cannot be reached, so callers can fall back to fetch detection.
 */
export async function detectWithBrowserWorker(input: {
  url: string;
  timeoutMs?: number;
}): Promise<WorkerDetectionOutcome> {
  const workerUrl = process.env.BROWSER_WORKER_URL;
  const workerSecret = process.env.BROWSER_WORKER_AUTH_SECRET;
  const detectUrl = workerDetectUrl();
  if (!workerUrl || !workerSecret || !detectUrl) {
    return { available: false, reason: 'BROWSER_WORKER_NOT_CONFIGURED: remote browser worker URL/secret is not set.' };
  }
  try {
    const response = await fetch(detectUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${workerSecret}`,
      },
      body: JSON.stringify({ url: input.url, timeoutMs: Math.min(Math.max(input.timeoutMs || 15000, 1000), 25000) }),
      signal: AbortSignal.timeout(26000),
    });
    if (!response.ok) {
      return { available: false, reason: `BROWSER_WORKER_DETECT_UNAVAILABLE: worker returned HTTP ${response.status}.` };
    }
    const result = (await response.json()) as {
      status?: string;
      hasForm?: boolean;
      forms?: WorkerDetectionForm[];
      errorMessage?: string;
    };
    if (result.status === 'CAPTCHA_DETECTED') {
      return { available: true, status: 'CAPTCHA_DETECTED', forms: [] };
    }
    if (result.status === 'NAVIGATION_FAILED') {
      return { available: true, status: 'NAVIGATION_FAILED', forms: [], errorMessage: result.errorMessage };
    }
    if (result.status === 'DETECTED' && Array.isArray(result.forms) && result.forms.length > 0) {
      return { available: true, status: 'DETECTED', forms: result.forms };
    }
    return { available: true, status: 'NOT_FOUND', forms: [] };
  } catch (error) {
    return { available: false, reason: `BROWSER_WORKER_DETECT_UNAVAILABLE: worker could not be reached (${error instanceof Error ? error.message : 'unknown error'}).` };
  }
}

export async function submitWithBrowserWorker(input: {
  contactPageUrl: string;
  formSelector: string;
  formAction?: string;
  formMethod?: string;
  mappedFields: FieldMappingAssignment[];
  timeoutMs: number;
}): Promise<SubmissionExecutionResult> {
  const startedAt = Date.now();
  const fields = input.mappedFields.filter((field) => !field.isHoneypot && field.valueToFill && field.strategy !== 'unmapped');
  const workerUrl = process.env.BROWSER_WORKER_URL;
  const workerSecret = process.env.BROWSER_WORKER_AUTH_SECRET;

  if (!workerUrl || !workerSecret) {
    return unavailable('BROWSER_RUNTIME_UNAVAILABLE: remote browser worker is not configured.', fields.length, startedAt);
  }

  const idempotencyKey = createHash('sha256')
    .update(JSON.stringify({ url: input.contactPageUrl, action: input.formAction, fields: fields.map(({ fieldSelector, valueToFill }) => [fieldSelector, valueToFill]) }))
    .digest('hex');
  const payload = {
    contactPageUrl: input.contactPageUrl,
    formSelector: input.formSelector,
    formAction: input.formAction,
    formMethod: input.formMethod || 'post',
    fields: fields.map(({ fieldSelector, valueToFill }) => ({ selector: fieldSelector, value: valueToFill })),
    timeoutMs: Math.min(Math.max(input.timeoutMs, 1_000), WORKER_TIMEOUT_MS),
    idempotencyKey,
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${workerSecret}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(payload.timeoutMs),
      });
      if (response.status === 409) {
        // The worker refused this exact payload as a duplicate of an
        // attempt made within the last 24h. That first attempt may already
        // have delivered, so this must NOT be reported as FAILED (which
        // would invite a blind resend) and must NOT be auto-retried. It is
        // held for human review instead; no credit is deducted (deduction
        // only happens on DELIVERED).
        return {
          status: 'REVIEW_REQUIRED', isDryRun: false, isTestMode: false, httpStatus: 409,
          fieldsFilledCount: fields.length, honeypotsNeutralizedCount: 0, successVerified: false, submitAttempted: false,
          errorMessage: 'A submission for this exact form was already attempted within 24h; the first attempt may have delivered, so this lead is held for review instead of being sent again.',
          diagnosticCode: 'DUPLICATE_SUBMISSION_BLOCKED',
          executionDurationMs: Date.now() - startedAt, submittedAt: new Date().toISOString(),
        };
      }
      if (!response.ok) {
        return unavailable(`BROWSER_RUNTIME_UNAVAILABLE: worker returned HTTP ${response.status}.`, fields.length, startedAt);
      }
      const result = await response.json() as Partial<SubmissionExecutionResult>;
      // Worker output is not trusted as delivery proof unless it supplies explicit verification.
      return {
        status: result.status === 'SUCCESS' && result.successVerified === true ? 'SUCCESS' : 'FAILED',
        isDryRun: false, isTestMode: false, httpStatus: result.httpStatus ?? null,
        fieldsFilledCount: result.fieldsFilledCount ?? fields.length,
        honeypotsNeutralizedCount: result.honeypotsNeutralizedCount ?? 0,
        confirmationMessage: result.successVerified === true ? result.confirmationMessage : undefined,
        errorMessage: result.successVerified === true ? undefined : result.errorMessage || 'Worker did not provide verified success evidence.',
        diagnosticCode: result.successVerified === true ? result.diagnosticCode : result.diagnosticCode || 'SUCCESS_VERIFICATION_FAILED',
        successVerified: result.successVerified === true,
        submitAttempted: result.submitAttempted === true,
        executionDurationMs: Date.now() - startedAt,
        submittedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        return unavailable(`BROWSER_RUNTIME_UNAVAILABLE: worker could not be reached (${error instanceof Error ? error.message : 'unknown error'}).`, fields.length, startedAt);
      }
    }
  }
  return unavailable('BROWSER_RUNTIME_UNAVAILABLE: worker could not be reached.', fields.length, startedAt);
}
