import { createHash } from 'node:crypto';
import type { FieldMappingAssignment } from './field-mapper';
import type { SubmissionExecutionResult } from './form-submitter';

const WORKER_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 2;

function configuredAllowedDomains(): string[] {
  return (process.env.BROWSER_WORKER_ALLOWED_DOMAINS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function targetAllowed(targetUrl: string): boolean {
  const allowList = configuredAllowedDomains();
  if (!allowList.length) return false;
  try {
    const host = new URL(targetUrl).hostname.toLowerCase();
    return allowList.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function unavailable(message: string, fieldsFilledCount: number, startedAt: number): SubmissionExecutionResult {
  return {
    status: 'FAILED', isDryRun: false, isTestMode: false, httpStatus: null,
    fieldsFilledCount, honeypotsNeutralizedCount: 0, successVerified: false, submitAttempted: false,
    executionDurationMs: Date.now() - startedAt, submittedAt: new Date().toISOString(),
    diagnosticCode: 'BROWSER_RUNTIME_UNAVAILABLE', errorMessage: message,
  };
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
  if (!targetAllowed(input.contactPageUrl)) {
    return unavailable('BROWSER_RUNTIME_UNAVAILABLE: target domain is not in the server-side worker allow-list.', fields.length, startedAt);
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
