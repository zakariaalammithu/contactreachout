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

function mockCampaignLead(lead) {
  mocks.client.from
    .mockImplementationOnce(() => makeBuilder({ data: [{ app_lead_id: lead.id }], error: null }))
    .mockImplementationOnce(() => makeBuilder({ data: [lead], error: null }));
}

describe('worker verify-domain route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.BROWSER_WORKER_AUTH_SECRET;
  });

  it('allows an exact campaign-lead domain', async () => {
    mockCampaignLead({ id: 'lead-1', email: null, domain: 'acme.com', website: null });
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('allows subdomains of a campaign-lead domain', async () => {
    mockCampaignLead({ id: 'lead-1', email: null, domain: 'acme.com', website: null });
    const response = await GET(request('www.acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('allows a host matching the lead website hostname', async () => {
    mockCampaignLead({ id: 'lead-1', email: null, domain: null, website: 'https://www.acme.com/contact' });
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('allows a host matching the lead email domain', async () => {
    mockCampaignLead({ id: 'lead-1', email: 'boss@acme.com', domain: null, website: null });
    const response = await GET(request('acme.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('denies hosts with no campaign lead', async () => {
    mockCampaignLead({ id: 'lead-1', email: null, domain: 'acme.com', website: null });
    const response = await GET(request('other.com', 'Bearer test-secret'));
    await expect(response.json()).resolves.toEqual({ allowed: false });
  });

  it('denies when no lead is attached to any campaign', async () => {
    mocks.client.from.mockImplementationOnce(() => makeBuilder({ data: [], error: null }));
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
