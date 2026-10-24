import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResendProvider } from '@/lib/services/email/resend-provider';

const originalKey = process.env.RESEND_API_KEY;

describe('ResendProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it('reports a missing API key without attempting a provider request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const provider = new ResendProvider();

    await expect(provider.testConnection()).resolves.toMatchObject({
      connected: false,
      error: 'MISSING_API_KEY',
    });
    await expect(provider.sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Test</p>' }))
      .resolves.toMatchObject({ success: false, errorCode: 'MISSING_API_KEY' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('distinguishes invalid credential rejection from other provider failures', async () => {
    process.env.RESEND_API_KEY = 're_invalid';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    await expect(new ResendProvider().testConnection()).resolves.toMatchObject({
      connected: false,
      error: 'INVALID_CREDENTIALS',
    });
  });

  it('reports network/provider validation failure without leaking the thrown error', async () => {
    process.env.RESEND_API_KEY = 're_network';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket details and secret context')));

    const result = await new ResendProvider().testConnection();
    expect(result).toMatchObject({ connected: false, error: 'NETWORK_OR_PROVIDER_ERROR' });
    expect(result.message).not.toContain('socket details');
  });

  it('reports provider acceptance only after Resend returns a message id', async () => {
    process.env.RESEND_API_KEY = 're_valid';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email_123' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));

    await expect(new ResendProvider().sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    })).resolves.toMatchObject({ success: true, messageId: 'email_123', statusCode: 200 });
  });
});
