import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mock = vi.hoisted(() => {
  class PersistenceAuthorizationError extends Error {}
  return { PersistenceAuthorizationError, resolve: vi.fn(), update: vi.fn(), archive: vi.fn() };
});
vi.mock('@/lib/persistence/identity', () => ({ PersistenceAuthorizationError: mock.PersistenceAuthorizationError, resolvePersistenceContext: mock.resolve }));
vi.mock('@/lib/persistence/campaign-repository', () => ({ updateCampaign: mock.update, archiveCampaign: mock.archive }));
const { PATCH, DELETE } = await import('@/app/api/persistence/campaigns/[id]/route');
const context = { appUserId: 'user-a', organizationId: 'org-a', emailNormalized: 'a@example.test', role: 'OWNER' };
const request = body => new NextRequest('http://test.local/api/persistence/campaigns/campaign-a', { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

describe('campaign dynamic route', () => {
  beforeEach(() => { mock.resolve.mockResolvedValue(context); mock.update.mockResolvedValue({ id: 'campaign-a' }); mock.archive.mockResolvedValue(); });
  it('strictly rejects browser-supplied tenant and ownership fields', async () => {
    const response = await PATCH(request({ name: 'Campaign', organizationId: 'org-b', createdByAppUserId: 'user-b' }), { params: { id: 'campaign-a' } });
    expect(response.status).toBe(400); expect(mock.resolve).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled();
  });
  it('uses resolved tenant context and maps errors without leaking operational details', async () => {
    const response = await PATCH(request({ name: 'Campaign' }), { params: { id: 'campaign-a' } });
    expect(response.status).toBe(200); expect(mock.update).toHaveBeenCalledWith(context, 'campaign-a', { name: 'Campaign' });
    mock.update.mockRejectedValueOnce(new mock.PersistenceAuthorizationError('Membership is inactive.'));
    expect((await PATCH(request({ name: 'Campaign' }), { params: { id: 'campaign-a' } })).status).toBe(403);
    mock.archive.mockRejectedValueOnce(new Error('database internals'));
    const unavailable = await DELETE(new NextRequest('http://test.local/campaign-a', { method: 'DELETE' }), { params: { id: 'campaign-a' } });
    expect(unavailable.status).toBe(503); expect((await unavailable.json()).error).toBe('Unable to archive campaign.');
  });
});
