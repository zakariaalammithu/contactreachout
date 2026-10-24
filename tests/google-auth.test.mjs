import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateGoogleIdentityClaims } from '@/lib/auth/google-identity';

const auth = vi.hoisted(() => ({
  getBySub: vi.fn(),
  getByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  createSession: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock('@/lib/auth/auth-store', () => ({ AuthStore: {
  getUserByGoogleSub: auth.getBySub,
  getUserByEmail: auth.getByEmail,
  createUser: auth.createUser,
  updateUser: auth.updateUser,
  createSession: auth.createSession,
} }));
vi.mock('@/lib/auth/session', () => ({ SessionManager: { setSessionCookie: auth.setCookie } }));

const { GET: googleCallback } = await import('@/app/api/auth/google/callback/route');
const { middleware } = await import('@/middleware');

const clientId = 'client.apps.googleusercontent.com';
const nonce = 'expected-nonce';
const verifiedClaims = {
  aud: clientId,
  email: 'verified@example.test',
  email_verified: 'true',
  exp: String(Math.floor(Date.now() / 1000) + 300),
  nonce,
  sub: 'google-subject',
  name: 'Verified User',
};

describe('Google identity verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    auth.getBySub.mockReset(); auth.getByEmail.mockReset(); auth.createUser.mockReset();
    auth.updateUser.mockReset(); auth.createSession.mockReset(); auth.setCookie.mockReset();
    auth.createUser.mockReturnValue({ id: 'user-1', email: verifiedClaims.email, name: verifiedClaims.name, role: 'USER', isEmailVerified: true });
    auth.createSession.mockReturnValue({ id: 'session-1', userId: 'user-1', email: verifiedClaims.email, role: 'USER', expiresAt: Date.now() + 60_000 });
  });

  it('accepts a verified, correctly scoped and nonce-bound Google identity', () => {
    expect(validateGoogleIdentityClaims(verifiedClaims, clientId, nonce)).toMatchObject({ email: verifiedClaims.email, sub: verifiedClaims.sub });
  });

  it('rejects unverified email, wrong audience, wrong nonce and expired claims', () => {
    expect(() => validateGoogleIdentityClaims({ ...verifiedClaims, email_verified: 'false' }, clientId, nonce)).toThrow('not verified');
    expect(() => validateGoogleIdentityClaims({ ...verifiedClaims, aud: 'other-client' }, clientId, nonce)).toThrow('audience');
    expect(() => validateGoogleIdentityClaims({ ...verifiedClaims, nonce: 'other' }, clientId, nonce)).toThrow('nonce');
    expect(() => validateGoogleIdentityClaims({ ...verifiedClaims, exp: '1' }, clientId, nonce)).toThrow('expired');
  });

  it('creates a session only after the live callback verifies Google claims', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id_token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(verifiedClaims), { status: 200 })));
    const request = new NextRequest('http://localhost/api/auth/google/callback?code=live-code&state=state-1', {
      headers: { cookie: `oauth_state=state-1; oauth_nonce=${nonce}` },
    });
    const response = await googleCallback(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
    expect(auth.createSession).toHaveBeenCalledTimes(1);
    expect(auth.setCookie).toHaveBeenCalledTimes(1);
  });

  it('does not create a session for an unverified Google email', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id_token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...verifiedClaims, email_verified: 'false' }), { status: 200 })));
    const request = new NextRequest('http://localhost/api/auth/google/callback?code=live-code&state=state-1', {
      headers: { cookie: `oauth_state=state-1; oauth_nonce=${nonce}` },
    });
    const response = await googleCallback(request);
    expect(response.headers.get('location')).toContain('/login?error=');
    expect(auth.createSession).not.toHaveBeenCalled();
  });
});

describe('protected-route session verification', () => {
  const token = (role = 'USER') => {
    const payload = Buffer.from(JSON.stringify({ role, expiresAt: Date.now() + 60_000 })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'contactreachout-session-secret').update(payload).digest('base64url');
    return `v2.${payload}.${signature}`;
  };

  it('redirects forged sessions and accepts a valid signed user session', async () => {
    const forged = await middleware(new NextRequest('http://localhost/dashboard', { headers: { cookie: 'app_session=v2.bad.signature' } }));
    expect(forged.status).toBe(307);
    expect(forged.headers.get('location')).toContain('/login');
    const valid = await middleware(new NextRequest('http://localhost/dashboard', { headers: { cookie: `app_session=${token()}` } }));
    expect(valid.status).toBe(200);
  });
});
