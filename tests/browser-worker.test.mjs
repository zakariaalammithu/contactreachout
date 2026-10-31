import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitWithBrowserWorker } from '@/lib/services/browser-worker-client';

const input = {
  contactPageUrl: 'https://example.test/contact',
  formSelector: 'form',
  formAction: '/contact',
  formMethod: 'post',
  mappedFields: [{ fieldSelector: '#email', fieldName: 'email', normalizedType: 'email', valueToFill: 'sender@example.test', confidence: 1, strategy: 'exact', isHoneypot: false, isRequired: true }],
  timeoutMs: 2_000,
};

describe('browser worker submission safety', () => {
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.BROWSER_WORKER_URL; delete process.env.BROWSER_WORKER_AUTH_SECRET; delete process.env.BROWSER_WORKER_ALLOWED_DOMAINS; });

  it('reports missing worker configuration without claiming a send attempt', async () => {
    const result = await submitWithBrowserWorker(input);
    expect(result).toMatchObject({ status: 'FAILED', diagnosticCode: 'BROWSER_RUNTIME_UNAVAILABLE', successVerified: false, submitAttempted: false });
  });

  it('does not block unlisted domains client-side; the worker enforces authorization', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    // No BROWSER_WORKER_ALLOWED_DOMAINS: the app must still call the worker,
    // which authorizes via its static list or dynamic campaign-lead check.
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'SUCCESS', successVerified: true, submitAttempted: true, diagnosticCode: 'SUCCESS_VERIFIED' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await submitWithBrowserWorker(input);
    expect(result.status).toBe('SUCCESS');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('accepts only explicit verified worker success and sends an idempotency key', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    process.env.BROWSER_WORKER_ALLOWED_DOMAINS = 'example.test';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'SUCCESS', successVerified: true, submitAttempted: true, diagnosticCode: 'SUCCESS_VERIFIED' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await submitWithBrowserWorker(input);
    expect(result.status).toBe('SUCCESS');
    expect(result.successVerified).toBe(true);
    const [, request] = fetchMock.mock.calls[0];
    expect(request.headers['idempotency-key']).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not turn provider rejection or unverified responses into success', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    process.env.BROWSER_WORKER_ALLOWED_DOMAINS = 'example.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rejected', { status: 503 })));
    const rejected = await submitWithBrowserWorker(input);
    expect(rejected).toMatchObject({ status: 'FAILED', successVerified: false, submitAttempted: false });
  });

  it('maps a worker 409 duplicate to REVIEW, never FAILED and never a resend', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-worker-secret';
    process.env.BROWSER_WORKER_ALLOWED_DOMAINS = 'example.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'FAILED', diagnosticCode: 'DUPLICATE_SUBMISSION_BLOCKED', successVerified: false, submitAttempted: false }), { status: 409 })));
    const result = await submitWithBrowserWorker(input);
    // A 409 means the first attempt may already have delivered: reporting
    // FAILED would invite a blind resend, and SUCCESS would be a lie.
    // REVIEW holds the lead for a human instead.
    expect(result).toMatchObject({ status: 'REVIEW_REQUIRED', diagnosticCode: 'DUPLICATE_SUBMISSION_BLOCKED', successVerified: false, submitAttempted: false });
  });

  it('retries a network failure with the same deterministic key', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    process.env.BROWSER_WORKER_ALLOWED_DOMAINS = 'example.test';
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'SUCCESS', successVerified: true, submitAttempted: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await submitWithBrowserWorker(input)).status).toBe('SUCCESS');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers['idempotency-key']).toBe(fetchMock.mock.calls[1][1].headers['idempotency-key']);
  });

  it('appends worker diagnostic evidence to an unverified failure message', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    process.env.BROWSER_WORKER_ALLOWED_DOMAINS = 'example.test';
    const evidence = {
      posts: [{ method: 'POST', status: 503, path: '/api/contact' }],
      fieldsStuck: '1/1',
      clearedFieldSelectors: [],
      pageSnippet: 'Please fill all fields',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'FAILED', diagnosticCode: 'SUCCESS_VERIFICATION_FAILED', successVerified: false, submitAttempted: true, fieldsFilledCount: 1, diagnosticEvidence: evidence }), { status: 200 })));
    const result = await submitWithBrowserWorker(input);
    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toContain('Worker did not provide verified success evidence.');
    expect(result.errorMessage).toContain('POST /api/contact -> 503');
    expect(result.errorMessage).toContain('fields stuck 1/1');
    expect(result.errorMessage).toContain('Please fill all fields');
    expect(result.diagnosticEvidence).toEqual(evidence);
  });

  it('leaves the generic message untouched when the worker sends no evidence', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    process.env.BROWSER_WORKER_ALLOWED_DOMAINS = 'example.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'FAILED', diagnosticCode: 'SUCCESS_VERIFICATION_FAILED', successVerified: false, submitAttempted: true, fieldsFilledCount: 1 }), { status: 200 })));
    const result = await submitWithBrowserWorker(input);
    expect(result.errorMessage).toBe('Worker did not provide verified success evidence.');
    expect(result.errorMessage).not.toContain('worker evidence');
  });

  it('renders requests-sent and retry attempts from worker evidence', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    process.env.BROWSER_WORKER_ALLOWED_DOMAINS = 'example.test';
    const evidence = {
      posts: [],
      requestsSent: 1,
      attempts: 2,
      fieldsStuck: '1/1',
      clearedFieldSelectors: [],
      pageSnippet: 'Send',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'FAILED', diagnosticCode: 'SUCCESS_VERIFICATION_FAILED', successVerified: false, submitAttempted: true, fieldsFilledCount: 1, diagnosticEvidence: evidence }), { status: 200 })));
    const result = await submitWithBrowserWorker(input);
    expect(result.errorMessage).toContain('posts: none');
    expect(result.errorMessage).toContain('requests sent: 1 (no response yet)');
    expect(result.errorMessage).toContain('attempts: 2');
  });
});
