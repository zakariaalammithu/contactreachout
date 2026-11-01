import { describe, expect, it } from 'vitest';
import { classifyFailure } from '@/lib/services/failure-reason';

describe('classifyFailure', () => {
  it('classifies a delivered row as Delivered/Verified, never a failure', () => {
    expect(
      classifyFailure({ finalStatus: 'DELIVERED', details: 'JSON success:true in form submission response' }),
    ).toEqual({ reason: 'Delivered', stage: 'Verified', action: 'No action — delivery verified.' });
  });

  it('classifies the 1-4 m.b2bgdc silent-handler row (tracking only, no form post)', () => {
    expect(
      classifyFailure({
        finalStatus: 'FAILED',
        details:
          'Worker did not provide verified success evidence. [worker evidence: why: No form submission was seen — only unrelated requests (e.g. tracking) left the browser.; posts: none; other posts: POST /__l5e/trackevents -> 202; attempts: 3; fields stuck 3/3]',
      }),
    ).toEqual({
      reason: 'Submission Not Observed (silent form handler)',
      stage: 'Submission',
      action: "The form never posted — check the site's submit handler and inbox; it may require a field left empty.",
    });
  });

  it('classifies the 1-1 contactreachout validation row', () => {
    expect(
      classifyFailure({
        finalStatus: 'FAILED',
        details:
          "Worker did not provide verified success evidence. [worker evidence: why: The site's own validation rejected the submission — the form read its fields as empty.; posts: none; attempts: 3]",
      }),
    ).toEqual({
      reason: 'Form Validation Failed',
      stage: 'Submission',
      action: "The site read its fields as empty — check the site's required fields and form system.",
    });
  });

  it('classifies duplicate REVIEW rows (24h protection)', () => {
    expect(
      classifyFailure({
        finalStatus: 'REVIEW',
        details: 'A submission for this exact form was already attempted within 24h; the first attempt may have delivered, so this lead is held for review instead of being sent again.',
      }),
    ).toEqual({
      reason: 'Duplicate (24h Protection)',
      stage: 'Submission',
      action: 'Same form + message within 24h — change the message text or wait 24h, then re-run.',
    });
  });

  it('classifies DNS-unreachable rows as a network error at discovery', () => {
    expect(
      classifyFailure({
        finalStatus: 'UNREACHABLE',
        details: 'page.goto: net::ERR_NAME_NOT_RESOLVED at https://aiautomation24h.com/',
      }),
    ).toEqual({
      reason: 'Network Error (DNS)',
      stage: 'Discovery',
      action: 'The site does not resolve — fix its DNS/hosting or remove it from the list.',
    });
  });

  it('classifies fetch-probing NO-FORM rows as no contact form', () => {
    expect(
      classifyFailure({
        finalStatus: 'NO-FORM',
        details: 'No contact page with a static form was verified via fetch probing (the page may be client-rendered).',
      }),
    ).toEqual({
      reason: 'No Contact Form',
      stage: 'Discovery',
      action: 'No contact form found on this site — skip it.',
    });
  });

  it('classifies worker-launch failures as worker errors, not site failures', () => {
    expect(
      classifyFailure({
        finalStatus: 'FAILED',
        code: 'BROWSER_RUNTIME_UNAVAILABLE',
        details: 'worker returned HTTP 503',
      }),
    ).toEqual({
      reason: 'Worker Error',
      stage: 'Worker',
      action: 'Worker/browser could not run — check worker health and retry.',
    });
  });

  it('classifies a mapping REVIEW (required field lacks lead data) as Required Fields Missing', () => {
    expect(
      classifyFailure({
        finalStatus: 'REVIEW',
        details: '2 mandatory field(s) on the form lack matching data.',
      }),
    ).toEqual({
      reason: 'Required Fields Missing',
      stage: 'Mapping',
      action: 'Add the missing data to the lead (e.g. a phone number) or skip this site.',
    });
  });

  it('never upgrades an unknown failure to delivered', () => {
    const result = classifyFailure({ finalStatus: 'FAILED', details: 'something unrecognized' });
    expect(result.reason).not.toBe('Delivered');
    expect(result.reason).toBe('Submission Failed');
  });
});
