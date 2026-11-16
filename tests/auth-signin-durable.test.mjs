// Sign-in must work for email users from ANY serverless instance, not
// just the one that handled their signup (2026-11-16). The password hash
// lives in the durable app_users row (migration 20261116000001); sign-in
// materializes it, and the /login signup form finally sends WhatsApp.
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: new Map(),
  upsertCalls: [],
  mode: 'ok',
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => {
    const findRow = (filters) => {
      for (const row of mocks.rows.values()) {
        let hit = true;
        for (const [col, val] of filters) {
          if (row[col] !== val) hit = false;
        }
        if (hit) return { ...row };
      }
      return null;
    };
    const makeChain = (table) => {
      const chain = {
        _cols: '',
        _filters: [],
        select(cols) {
          chain._cols = cols;
          return chain;
        },
        eq(col, val) {
          chain._filters.push([col, val]);
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        async maybeSingle() {
          if (
            table === 'app_users'
            && chain._cols.includes('password_hash')
            && mocks.mode === 'no-password-columns'
          ) {
            return { data: null, error: { message: 'column "password_hash" does not exist' } };
          }
          return { data: findRow(chain._filters), error: null };
        },
        async upsert(row) {
          mocks.upsertCalls.push({ ...row });
          if (mocks.mode === 'no-password-columns' && row.password_hash !== undefined) {
            return { error: { message: 'column "password_hash" does not exist' } };
          }
          const key = (row.email_normalized || '').toLowerCase().trim();
          const prev = mocks.rows.get(key) || {};
          mocks.rows.set(key, { ...prev, ...row });
          return { error: null };
        },
      };
      return chain;
    };
    return { from: (table) => makeChain(table) };
  },
}));

vi.mock('@/lib/auth/email-verification-service', () => ({
  EmailVerificationService: {
    verifyCode: () => ({ valid: true }),
    sendVerificationCode: async () => ({
      success: true,
      maskedEmail: 't***@example.test',
      message: 'ok',
      cooldownSeconds: 0,
    }),
  },
}));

const { AuthStore } = await import('@/lib/auth/auth-store');
const { writeDurableContact } = await import('@/lib/services/profile-contact-service');
const { ensureUserInRegistry } = await import('@/lib/services/durable-users');
const { POST: signupPOST } = await import('@/app/api/auth/signup/route');
const { POST: signinPOST } = await import('@/app/api/auth/signin/route');
const { POST: verifyOtpPOST } = await import('@/app/api/auth/verify-otp/route');

async function postJson(handler, body) {
  const res = await handler(
    new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, data: await res.json() };
}

describe('signup validation names the missing field', () => {
  it('a missing whatsApp says WhatsApp, never the bare word Required', async () => {
    const { status, data } = await postJson(signupPOST, {
      fullName: 'Contact Reachout',
      email: 'missing-wa@example.test',
      phone: '+8801633687149',
      password: 'Test1234',
      confirmPassword: 'Test1234',
    });
    expect(status).toBe(400);
    expect(data.error).toBe('WhatsApp number is required for live campaigns');
  });

  it('a missing phone says Phone', async () => {
    const { status, data } = await postJson(signupPOST, {
      fullName: 'Contact Reachout',
      email: 'missing-phone@example.test',
      whatsApp: '+8801633687149',
      password: 'Test1234',
      confirmPassword: 'Test1234',
    });
    expect(status).toBe(400);
    expect(data.error).toBe('Phone number is required for live campaigns');
  });

  it('a raw local number fails on phone normalization, not on whatsApp', async () => {
    const { status, data } = await postJson(signupPOST, {
      fullName: 'Contact Reachout',
      email: 'raw-phone@example.test',
      phone: '01633687149',
      whatsApp: '01633687149',
      password: 'Test1234',
      confirmPassword: 'Test1234',
    });
    expect(status).toBe(400);
    expect(data.error).toBe('Enter a valid phone number.');
  });
});

describe('durable password hash', () => {
  it('writeDurableContact stores the hash when the columns exist', async () => {
    mocks.mode = 'ok';
    mocks.upsertCalls.length = 0;
    const ok = await writeDurableContact('usr-test-1', 'hash-ok@example.test', {
      displayName: 'Hash Ok',
      passwordHash: 'hash-value',
      passwordSalt: 'salt-value',
    });
    expect(ok).toBe(true);
    expect(mocks.upsertCalls).toHaveLength(1);
    expect(mocks.upsertCalls[0].password_hash).toBe('hash-value');
    expect(mocks.upsertCalls[0].password_salt).toBe('salt-value');
  });

  it('writeDurableContact still lands the identity when the password columns are missing', async () => {
    mocks.mode = 'no-password-columns';
    mocks.upsertCalls.length = 0;
    const ok = await writeDurableContact('usr-test-2', 'hash-missing@example.test', {
      displayName: 'Hash Missing',
      passwordHash: 'hash-value',
      passwordSalt: 'salt-value',
    });
    expect(ok).toBe(false);
    expect(mocks.upsertCalls.length).toBeGreaterThanOrEqual(2);
    const last = mocks.upsertCalls[mocks.upsertCalls.length - 1];
    expect(last.password_hash).toBeUndefined();
    expect(last.display_name).toBe('Hash Missing');
    mocks.mode = 'ok';
  });

  it('verify-otp writes the same hash durably that the AuthStore record carries', async () => {
    mocks.mode = 'ok';
    mocks.upsertCalls.length = 0;
    const email = 'otp-hash@example.test';
    AuthStore.savePendingSignup({
      fullName: 'Otp Hash',
      email,
      phone: '+8801633687149',
      whatsApp: '+8801633687149',
      password: 'RealPass123',
    });
    const { status, data } = await postJson(verifyOtpPOST, { email, code: '123456' });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    const user = AuthStore.getUserByEmail(email);
    expect(user?.passwordHash).toBeTruthy();
    const row = mocks.upsertCalls.find((c) => c.email_normalized === email);
    expect(row?.password_hash).toBe(user.passwordHash);
    expect(row?.password_salt).toBe(user.salt);
  });

  it('ensureUserInRegistry materializes the stored hash, not a random one', async () => {
    const email = 'materialize-hash@example.test';
    const { hash, salt } = AuthStore.hashPassword('RealPass123');
    mocks.rows.set(email, {
      email_normalized: email,
      display_name: 'Materialize Hash',
      company_name: '',
      created_at: '2026-11-16T00:00:00.000Z',
      password_hash: hash,
      password_salt: salt,
    });
    const user = await ensureUserInRegistry(email);
    expect(user).not.toBeNull();
    expect(user.passwordHash).toBe(hash);
    expect(user.salt).toBe(salt);
    expect(AuthStore.verifyPassword('RealPass123', user.passwordHash, user.salt)).toBe(true);
    expect(AuthStore.verifyPassword('WrongPass123', user.passwordHash, user.salt)).toBe(false);
  });

  it('sign-in works from a fresh registry with the real password, and never with a wrong one', async () => {
    const email = 'signin-fresh@example.test';
    const { hash, salt } = AuthStore.hashPassword('RealPass123');
    mocks.rows.set(email, {
      email_normalized: email,
      display_name: 'Signin Fresh',
      company_name: '',
      created_at: '2026-11-16T00:00:00.000Z',
      password_hash: hash,
      password_salt: salt,
    });
    expect(AuthStore.getUserByEmail(email)).toBeNull();
    const good = await postJson(signinPOST, { email, password: 'RealPass123' });
    expect(good.status).toBe(200);
    expect(good.data.authenticated).toBe(true);
    const bad = await postJson(signinPOST, { email, password: 'WrongPass123' });
    expect(bad.status).toBe(400);
    expect(bad.data.error).toBe('Invalid email or password.');
  });

  it('a durable row without a hash never signs in with any password', async () => {
    const email = 'signin-nohash@example.test';
    mocks.rows.set(email, {
      email_normalized: email,
      display_name: 'Signin No Hash',
      company_name: '',
      created_at: '2026-11-16T00:00:00.000Z',
    });
    const res = await postJson(signinPOST, { email, password: 'anything-at-all' });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid email or password.');
    const user = AuthStore.getUserByEmail(email);
    expect(user?.passwordHash).toBeTruthy();
    expect(AuthStore.verifyPassword('anything-at-all', user.passwordHash, user.salt)).toBe(false);
  });
});
