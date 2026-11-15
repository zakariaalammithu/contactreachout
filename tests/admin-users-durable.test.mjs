// Admin Users must show users created on another instance (2026-11-15):
// the list reads AuthStore (per-instance memory) only, so a signup that
// landed on a different Vercel instance never appears. The fix syncs
// durable app_users rows into the registry on list + manage actions.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const mockWriteDurableContact = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/services/profile-contact-service', () => ({
  writeDurableContact: (...args) => mockWriteDurableContact(...args),
}));

// Fake Supabase admin client: configurable app_users rows + call record.
// Every other table answers "no rows" so wallet/credit fallbacks engage.
let durableRows = [];
const deletedEmails = [];
const upsertedRows = [];

function queryFor(table) {
  const state = { table, filters: {}, op: 'select' };
  const answer = () => {
    if (table === 'app_users' && state.op === 'delete') {
      deletedEmails.push(String(state.filters.email_normalized || ''));
      return { error: null };
    }
    if (table === 'app_users' && state.op === 'upsert') {
      upsertedRows.push(state.row);
      return { error: null };
    }
    if (table === 'app_users') {
      const email = state.filters.email_normalized;
      const rows = email ? durableRows.filter((r) => r.email_normalized === email) : durableRows;
      if (state.op === 'maybeSingle') return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }
    return { data: null, error: null };
  };
  const q = {
    select: () => q,
    eq: (col, val) => { state.filters[col] = val; return q; },
    order: () => q,
    limit: () => q,
    maybeSingle: () => { state.op = 'maybeSingle'; return Promise.resolve(answer()); },
    delete: () => { state.op = 'delete'; return q; },
    upsert: (row) => { state.op = 'upsert'; state.row = row; return Promise.resolve(answer()); },
    then: (resolve, reject) => Promise.resolve(answer()).then(resolve, reject),
  };
  return q;
}

const mockGetSupabaseAdminClient = vi.fn(() => ({ from: (table) => queryFor(table) }));
vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => mockGetSupabaseAdminClient(),
}));

const { AuthStore } = await import('@/lib/auth/auth-store');
const { GET, POST, PATCH, DELETE } = await import('@/app/api/admin/users/route');

const SECRET = 'contactreachout-session-secret';
function adminCookie() {
  const now = Date.now();
  const payload = {
    sessionId: 'sess-admin-test',
    userId: 'usr-superadmin-001',
    email: 'mithusquare@gmail.com',
    role: 'SUPER_ADMIN',
    expiresAt: now + 3600_000,
    issuedAt: now,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `app_session=v2.${b64}.${sig}`;
}

function adminRequest(url, init) {
  return new NextRequest(url, {
    ...(init || {}),
    headers: { cookie: adminCookie(), ...((init && init.headers) || {}) },
  });
}

describe('admin users durable sync', () => {
  beforeEach(() => {
    durableRows = [];
    deletedEmails.length = 0;
    upsertedRows.length = 0;
    mockWriteDurableContact.mockClear();
    mockGetSupabaseAdminClient.mockClear();
    mockGetSupabaseAdminClient.mockImplementation(() => ({ from: (table) => queryFor(table) }));
  });

  it('lists a durable-only user the local registry never saw', async () => {
    AuthStore.createUser({ name: 'Local User', email: 'local-user@example.com', password: 'password-1234' });
    durableRows = [
      { email_normalized: 'local-user@example.com', display_name: 'Local User', company_name: 'Local Co', created_at: '2026-11-15T00:00:00.000Z' },
      { email_normalized: 'new-user@example.com', display_name: 'New User', company_name: '', created_at: '2026-11-14T10:00:00.000Z' },
    ];
    const res = await GET(adminRequest('http://localhost:3123/api/admin/users?limit=100'));
    expect(res.status).toBe(200);
    const body = await res.json();
    const emails = body.users.map((u) => u.email);
    expect(emails).toContain('new-user@example.com');
    expect(emails).toContain('local-user@example.com');
    expect(emails).toContain('mithusquare@gmail.com');
    const added = body.users.find((u) => u.email === 'new-user@example.com');
    expect(added).toMatchObject({ role: 'USER', plan: 'Free', isEmailVerified: true });
    expect(added.createdAt).toBe('2026-11-14T10:00:00.000Z');
    // The AuthStore record wins on conflict: the local user's company
    // stays the AuthStore value, not the durable row's.
    const local = body.users.find((u) => u.email === 'local-user@example.com');
    expect(local.company).toBe('');
  });

  it('falls back to AuthStore-only when Supabase is unavailable', async () => {
    mockGetSupabaseAdminClient.mockReturnValueOnce(null);
    const res = await GET(adminRequest('http://localhost:3123/api/admin/users?limit=100'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.map((u) => u.email)).toContain('mithusquare@gmail.com');
  });

  it('materializes a durable-only user on PATCH so they stay manageable', async () => {
    durableRows = [
      { email_normalized: 'patch-user@example.com', display_name: 'Patch User', company_name: '', created_at: '2026-11-14T09:00:00.000Z' },
    ];
    expect(AuthStore.getUserByEmail('patch-user@example.com')).toBeNull();
    const res = await PATCH(adminRequest('http://localhost:3123/api/admin/users', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'patch-user@example.com', isSuspended: true }),
    }));
    expect(res.status).toBe(200);
    const updated = AuthStore.getUserByEmail('patch-user@example.com');
    expect(updated.isSuspended).toBe(true);
    expect(updated.role).toBe('USER');
  });

  it('deletes the durable row on DELETE so the user cannot resurrect', async () => {
    durableRows = [
      { email_normalized: 'delete-user@example.com', display_name: 'Delete User', company_name: '', created_at: '2026-11-14T08:00:00.000Z' },
    ];
    const res = await DELETE(adminRequest('http://localhost:3123/api/admin/users', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'delete-user@example.com', confirmEmail: 'delete-user@example.com' }),
    }));
    expect(res.status).toBe(200);
    expect(AuthStore.getUserByEmail('delete-user@example.com')).toBeNull();
    expect(deletedEmails).toContain('delete-user@example.com');
  });

  it('writes a durable row when an admin creates a user', async () => {
    const res = await POST(adminRequest('http://localhost:3123/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin-created@example.com', name: 'Admin Created', password: 'password-1234', role: 'USER' }),
    }));
    expect(res.status).toBe(200);
    expect(mockWriteDurableContact).toHaveBeenCalledWith(
      expect.any(String),
      'admin-created@example.com',
      expect.objectContaining({ displayName: 'Admin Created' }),
    );
  });

  it('a materialized user cannot sign in with an arbitrary password', async () => {
    durableRows = [
      { email_normalized: 'materialized@example.com', display_name: 'Materialized', company_name: '', created_at: '2026-11-14T07:00:00.000Z' },
    ];
    const res = await GET(adminRequest('http://localhost:3123/api/admin/users?limit=100'));
    expect(res.status).toBe(200);
    const user = AuthStore.getUserByEmail('materialized@example.com');
    expect(user).not.toBeNull();
    // The record carries a real (random) password hash, never an empty
    // one: the signin route would otherwise let anyone in.
    expect(user.passwordHash).toBeTruthy();
    expect(user.salt).toBeTruthy();
    expect(AuthStore.verifyPassword('anything-at-all', user.passwordHash, user.salt)).toBe(false);
  });
});

describe('google callback durable write', () => {
  it('writes a durable contact row for a first-time Google user', async () => {
    const { GET } = await import('@/app/api/auth/google/callback/route');
    const res = await GET(new NextRequest(
      'http://localhost:3123/api/auth/google/callback?code=mock_test123&state=s1&email=google-new@example.com&name=Google+New',
      { headers: { cookie: 'oauth_state=s1' } },
    ));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
    expect(mockWriteDurableContact).toHaveBeenCalledWith(
      expect.any(String),
      'google-new@example.com',
      expect.objectContaining({ displayName: 'Google New', replyEmail: 'google-new@example.com' }),
    );
    expect(AuthStore.getUserByEmail('google-new@example.com').isEmailVerified).toBe(true);
  });
});
