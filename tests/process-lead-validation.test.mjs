import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/session', () => ({
  SessionManager: { getSessionFromRequest: () => ({ email: 'owner@example.test', userId: 'usr-owner-001' }) },
}));
vi.mock('@/lib/auth/auth-store', () => ({
  AuthStore: { getUserByEmail: () => undefined },
}));

const { POST } = await import('@/app/api/campaigns/process/route');

const request = (lead) => new NextRequest('http://test.local/api/campaigns/process', {
  method: 'POST',
  body: JSON.stringify({
    campaignId: 'camp-test',
    campaignName: 'Test',
    lead,
    template: { subjectTemplate: 'Hi', bodyTemplate: 'Hello {{company_name}}' },
    options: {},
  }),
  headers: { 'content-type': 'application/json' },
});

// Regression (campaign camp-1794411499007, 11 Nov 2026): 4 leads failed
// with "Missing required lead details (website, company_name)" even
// though the report showed their websites — the missing piece was the
// company name, and the lumped message hid which field was absent.
describe('process route lead validation', () => {
  it('names company_name when only the website is present', async () => {
    const response = await POST(request({ id: 'l1', website: 'https://handy.uy' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('company_name');
    expect(body.error).not.toContain('website');
  });

  it('names website when only the company name is present', async () => {
    const response = await POST(request({ id: 'l1', company_name: 'Handy' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('website');
    expect(body.error).not.toContain('company_name');
  });

  it('names both when the lead has neither', async () => {
    const response = await POST(request({ id: 'l1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('website');
    expect(body.error).toContain('company_name');
  });

  it('names both when there is no lead at all', async () => {
    const response = await POST(request(undefined));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('website');
    expect(body.error).toContain('company_name');
  });
});
