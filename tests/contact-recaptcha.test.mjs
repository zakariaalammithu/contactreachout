// reCAPTCHA v2 gate on the public contact/demo form (2026-11-21): bots
// submit gibberish to /api/contact and burn the Resend daily quota. The
// server verifies the widget token against Google siteverify before any
// email is sent. Until RECAPTCHA_SECRET_KEY is configured the check is
// skipped (fail open) so the form keeps working while the owner creates
// the keys; once set, a missing/invalid token is rejected and a siteverify
// failure fails closed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyRecaptchaToken } from '@/lib/services/recaptcha';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/services/email/resend-provider', () => ({
  ResendProvider: vi.fn(() => ({ sendEmail: mocks.sendEmail })),
}));

const { POST } = await import('@/app/api/contact/route');

const validBody = {
  name: 'Jane Doe',
  email: 'jane@company.com',
  company: 'Acme Corp',
  website: 'https://company.com',
  subject: 'General Question',
  message: 'Please tell me more about the outreach plans.',
  topic: 'contact',
};

// The route rate-limits 5 requests per 15 min per IP from a module-level
// map, so every request in this file uses its own IP.
let ipCounter = 0;
function contactRequest(body, { formData = false } = {}) {
  ipCounter += 1;
  const headers = { 'x-forwarded-for': `10.0.0.${ipCounter}` };
  if (formData) {
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) form.append(key, value);
    return new NextRequest('http://test.local/api/contact', {
      method: 'POST',
      headers,
      body: form,
    });
  }
  return new NextRequest('http://test.local/api/contact', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function stubSiteverify(result) {
  return vi.fn(async () => ({ json: async () => result }));
}

describe('verifyRecaptchaToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', stubSiteverify({ success: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RECAPTCHA_SECRET_KEY;
  });

  it('skips the check when the secret is not configured (fail open)', async () => {
    await expect(verifyRecaptchaToken(undefined)).resolves.toEqual({ ok: true, skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a missing token once the secret is set', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    await expect(verifyRecaptchaToken(undefined)).resolves.toEqual({ ok: false, reason: 'missing-token' });
    await expect(verifyRecaptchaToken('')).resolves.toEqual({ ok: false, reason: 'missing-token' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a token Google verifies', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    await expect(verifyRecaptchaToken('valid-token')).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects a token Google refuses', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', stubSiteverify({ success: false, 'error-codes': ['invalid-input-response'] }));
    await expect(verifyRecaptchaToken('bad-token')).resolves.toEqual({ ok: false, reason: 'invalid-token' });
  });

  it('fails closed when siteverify is unreachable', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(verifyRecaptchaToken('any-token')).resolves.toEqual({
      ok: false,
      reason: 'verification-unavailable',
    });
  });

  it('fails closed when siteverify returns an unreadable body', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => { throw new Error('bad json'); } })));
    await expect(verifyRecaptchaToken('any-token')).resolves.toEqual({
      ok: false,
      reason: 'verification-unavailable',
    });
  });
});

describe('POST /api/contact CAPTCHA gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RECAPTCHA_SECRET_KEY;
  });

  it('sends the email when Google verifies the token', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', stubSiteverify({ success: true }));
    const response = await POST(contactRequest({ ...validBody, 'g-recaptcha-response': 'valid-token' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects a submission with no token and sends nothing', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', stubSiteverify({ success: true }));
    const response = await POST(contactRequest(validBody));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'CAPTCHA_REQUIRED' });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a token Google refuses and sends nothing', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', stubSiteverify({ success: false }));
    const response = await POST(contactRequest({ ...validBody, 'g-recaptcha-response': 'bad-token' }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'CAPTCHA_REQUIRED' });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('answers 503 without sending when siteverify is unreachable', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const response = await POST(contactRequest({ ...validBody, 'g-recaptcha-response': 'any-token' }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'CAPTCHA_UNAVAILABLE' });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('still sends without a token while the secret is not configured (fail open)', async () => {
    vi.stubGlobal('fetch', stubSiteverify({ success: true }));
    const response = await POST(contactRequest(validBody));
    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('gates the native form-data submit the same way (token from the widget field)', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', stubSiteverify({ success: true }));
    const response = await POST(
      contactRequest({ ...validBody, 'g-recaptcha-response': 'valid-token' }, { formData: true }),
    );
    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects the native form-data submit with no token', async () => {
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
    vi.stubGlobal('fetch', stubSiteverify({ success: true }));
    const response = await POST(contactRequest(validBody, { formData: true }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'CAPTCHA_REQUIRED' });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
