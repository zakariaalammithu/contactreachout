import { describe, expect, it } from 'vitest';
import { isVerifiedFormSubmission } from '@/lib/services/submission-verification';

const base = {
  discovery: { status: 'FOUND' },
  detection: { hasContactForm: true, selectedForm: { formSelector: 'form' } },
  mapping: { status: 'READY_FOR_SUBMISSION' },
  submission: { status: 'SUCCESS', successVerified: true },
};

describe('isVerifiedFormSubmission', () => {
  it('accepts a fully verified submission', () => {
    expect(isVerifiedFormSubmission(base)).toBe(true);
  });

  it('accepts a MAPPED mapping as well as READY_FOR_SUBMISSION', () => {
    expect(isVerifiedFormSubmission({ ...base, mapping: { status: 'MAPPED' } })).toBe(true);
  });

  it('accepts a worker-verified form when fetch probing returned NOT_FOUND (JS-rendered pages)', () => {
    // The b2bgdc case: fetch probing cannot verify a client-rendered
    // contact page, but the worker rendered a form on the lead's own
    // site and verified the submission. That must count as DELIVERED,
    // not FAILED.
    expect(isVerifiedFormSubmission({ ...base, discovery: { status: 'NOT_FOUND' } })).toBe(true);
  });

  it('rejects NOT_FOUND discovery when no form was detected', () => {
    expect(
      isVerifiedFormSubmission({
        ...base,
        discovery: { status: 'NOT_FOUND' },
        detection: { hasContactForm: false, selectedForm: null },
      })
    ).toBe(false);
  });

  it('rejects NOT_FOUND discovery when detection has no selected form', () => {
    expect(
      isVerifiedFormSubmission({
        ...base,
        discovery: { status: 'NOT_FOUND' },
        detection: { hasContactForm: true, selectedForm: null },
      })
    ).toBe(false);
  });

  it('rejects unready mapping', () => {
    expect(isVerifiedFormSubmission({ ...base, mapping: { status: 'MISSING_MANDATORY_FIELDS' } })).toBe(false);
  });

  it('rejects a non-SUCCESS submission', () => {
    expect(isVerifiedFormSubmission({ ...base, submission: { status: 'FAILED', successVerified: false } })).toBe(false);
  });

  it('rejects an unverified SUCCESS', () => {
    expect(isVerifiedFormSubmission({ ...base, submission: { status: 'SUCCESS', successVerified: false } })).toBe(false);
  });
});
