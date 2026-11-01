/**
 * Per-website failure classification for campaign reports (2026-11-01).
 *
 * The campaign CSV already carries raw evidence (Diagnostic Code +
 * Diagnostic Details, including the worker's plain-words "why:" sentence
 * and its posts/otherPosts/attempts evidence). This pure mapper turns
 * that evidence into the three report columns the owner asked for:
 *
 * - Failure Reason: a standardized reason from the report taxonomy
 *   (No Contact Form, Form Validation Failed, CAPTCHA Detected, ...).
 * - Failure Stage: which pipeline stage failed (Discovery, Detection,
 *   Mapping, Submission, Verification, Review, Worker).
 * - Suggested Action: the concrete next step for that reason.
 *
 * Delivered rows classify as Delivered/Verified — a reason is never
 * invented for a success, and a failure is never reported as delivered:
 * the mapper only reads the recorded outcome, it never upgrades one.
 */

export type FailureClassification = {
  reason: string;
  stage: string;
  action: string;
};

export type FailureInput = {
  finalStatus?: string | null;
  submissionStatus?: string | null;
  successVerification?: string | null;
  code?: string | null;
  details?: string | null;
};

const has = (text: string, ...needles: string[]) =>
  needles.some((needle) => text.includes(needle));

export function classifyFailure(input: FailureInput): FailureClassification {
  const final = String(input.finalStatus || input.submissionStatus || '')
    .toUpperCase()
    .trim();
  const text = [
    input.code || '',
    input.details || '',
    input.successVerification || '',
  ]
    .join(' ')
    .toLowerCase();

  if (final === 'DELIVERED') {
    return { reason: 'Delivered', stage: 'Verified', action: 'No action — delivery verified.' };
  }
  if (final === 'DRY_RUN_COMPLETED' || final === 'DRY_RUN') {
    return { reason: 'Dry run (no live send)', stage: 'Verified', action: 'No action — dry run only.' };
  }
  if (final === 'PENDING' || final === 'NOT_ATTEMPTED' || final === '') {
    return { reason: 'Not Attempted', stage: '—', action: '—' };
  }
  if (final === 'UNREACHABLE') {
    if (has(text, 'err_name_not_resolved', 'enotfound', 'dns')) {
      return {
        reason: 'Network Error (DNS)',
        stage: 'Discovery',
        action: 'The site does not resolve — fix its DNS/hosting or remove it from the list.',
      };
    }
    return {
      reason: 'Network Error',
      stage: 'Discovery',
      action: 'The site could not be reached — check it is online, then retry.',
    };
  }
  if (final === 'NO-FORM' || final === 'NO_FORM') {
    if (has(text, 'fetch probing')) {
      return {
        reason: 'No Contact Form',
        stage: 'Discovery',
        action: 'No contact form found on this site — skip it.',
      };
    }
    return {
      reason: 'Form Not Detected',
      stage: 'Detection',
      action: 'A form may exist but could not be detected (JS-rendered or hidden) — check the site manually.',
    };
  }
  if (final === 'REVIEW' || final === 'REVIEW_REQUIRED' || final === 'CAPTCHA_REVIEW') {
    if (has(text, 'already attempted within 24h')) {
      return {
        reason: 'Duplicate (24h Protection)',
        stage: 'Submission',
        action: 'Same form + message within 24h — change the message text or wait 24h, then re-run.',
      };
    }
    if (final === 'CAPTCHA_REVIEW' || has(text, 'captcha')) {
      return {
        reason: 'CAPTCHA Detected',
        stage: 'Submission',
        action: 'Manual review — CAPTCHAs are never bypassed.',
      };
    }
    if (has(text, 'lack matching data')) {
      return {
        reason: 'Required Fields Missing',
        stage: 'Mapping',
        action: 'Add the missing data to the lead (e.g. a phone number) or skip this site.',
      };
    }
    return {
      reason: 'Manual Review Required',
      stage: 'Review',
      action: 'Review this lead manually before any resend.',
    };
  }
  if (final === 'FAILED' || final === 'SUBMIT_FAILED') {
    if (
      has(
        text,
        'browser_runtime_unavailable',
        'worker returned http 503',
        'chromium.launch',
        'browser launch',
        'worker did not respond',
      )
    ) {
      return {
        reason: 'Worker Error',
        stage: 'Worker',
        action: 'Worker/browser could not run — check worker health and retry.',
      };
    }
    if (has(text, 'timeout', 'timed out')) {
      return {
        reason: 'Submission Timeout',
        stage: 'Submission',
        action: 'The site was too slow — retry later.',
      };
    }
    if (
      has(
        text,
        'validation',
        'read its fields as empty',
        'must be at least',
        'fields as empty',
      )
    ) {
      return {
        reason: 'Form Validation Failed',
        stage: 'Submission',
        action: "The site read its fields as empty — check the site's required fields and form system.",
      };
    }
    if (has(text, 'missing mandatory form fields')) {
      return {
        reason: 'Required Fields Missing',
        stage: 'Mapping',
        action: 'Required fields could not be mapped — check the form and the lead data.',
      };
    }
    if (
      has(
        text,
        'only unrelated requests',
        'no form submission was seen',
        'no request left',
        'no-request',
      )
    ) {
      return {
        reason: 'Submission Not Observed (silent form handler)',
        stage: 'Submission',
        action: "The form never posted — check the site's submit handler and inbox; it may require a field left empty.",
      };
    }
    if (
      has(
        text,
        'no success confirmation',
        'could not be verified from the confirmation',
        'posted-no-confirmation',
      )
    ) {
      return {
        reason: 'Verification Failed',
        stage: 'Verification',
        action: 'Check the site inbox — the message may still have arrived.',
      };
    }
    if (has(text, 'backend', 'server returned', 'server rejected', 'server error', ' 503', ' 500', ' 502', 'status 5')) {
      return {
        reason: 'Submission Rejected',
        stage: 'Submission',
        action: 'The site server rejected the send — retry later.',
      };
    }
    return {
      reason: 'Submission Failed',
      stage: 'Submission',
      action: 'See Diagnostic Details for the evidence.',
    };
  }
  return {
    reason: 'Submission Failed',
    stage: 'Submission',
    action: 'See Diagnostic Details for the evidence.',
  };
}
