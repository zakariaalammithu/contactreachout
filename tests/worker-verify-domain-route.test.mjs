import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const client = { from: vi.fn() };
  return { client };
});

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => mocks.client,
}));

const { GET } = await import('@/app/api/worker/verify-domain/route');

// Minimal supabase-js thenable: chainable filters, awaitable result.
function makeBuilder(result) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    or: () => builder,
    maybeSingle: async () => result,
    then: (resolve) => resolve(result),
  };
  return builder;
}

function request(domain, authorization) {
  const url = domain === null
    ? 'http://test.local/api/worker/verify-domain'
    : `http://test.local/api/worker/verify-domain?domain=${encodeURIComponent(domain)}`;
  return new NextRequest(url, {
    headers: authorization === undefined ? {} : { authorization },
  });
}

// Queue one mocked `from()` result per query the route makes, in order:
// leads-by-domain, then (only when nothing matched) leads-by-fallback,
// then (only when a lead matched) the campaign-link check.
function mockSequence(...results) {
  for (const result of results) {
    mocks.client.from.mockImplementationOnce(() => makeBuilder(result));
  }
}

const linkRow = (id) => ({ data: [{ app_lead_id: id }], error: null });
const noRows = { data: [], error: null };

describe('worker verify-domain route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.BROWSER_WORKER_AUTH_SECRET;
  });

  it('allows an exact campaign-lead domain', async () => {
    const lead = { id: 'lead-1', email: null, domain: 'acme.com', website: null };
    mockSequence({ data: [lead], error: null }, linkRow('lead-1'));
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('allows subdomains of a campaign-lead domain', async () => {
    const lead = { id: 'lead-1', email: null, domain: 'acme.com', website: null };
    mockSequence({ data: [lead], error: null }, linkRow('lead-1'));
    const response = await GET(request('www.acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('allows a host matching the lead website hostname', async () => {
    const lead = { id: 'lead-1', email: null, domain: null, website: 'https://www.acme.com/contact' };
    mockSequence(noRows, { data: [lead], error: null }, linkRow('lead-1'));
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('allows a host matching the lead email domain', async () => {
    const lead = { id: 'lead-1', email: 'boss@acme.com', domain: null, website: null };
    mockSequence(noRows, { data: [lead], error: null }, linkRow('lead-1'));
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('denies hosts with no campaign lead', async () => {
    mockSequence(noRows, noRows);
    const response = await GET(request('other.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: false });
  });

  it('denies a lead that is not attached to any campaign', async () => {
    const lead = { id: 'lead-1', email: null, domain: 'acme.com', website: null };
    mockSequence({ data: [lead], error: null }, noRows);
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: false });
  });

  it('denies when no lead matches the host', async () => {
    mockSequence(noRows, noRows);
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: false });
  });

  it('rejects unauthenticated callers without touching the database', async () => {
    const response = await GET(request('acme.com', undefined));
    expect(response.status).toBe(401);
    expect(mocks.client.from).not.toHaveBeenCalled();
    const wrong = await GET(request('acme.com', 'Bearer wrong-secret'));
    expect(wrong.status).toBe(401);
  });

  it('requires a domain parameter', async () => {
    const response = await GET(request(null, 'Bearer test-secret'));
    expect(response.status).toBe(400);
  });
});
