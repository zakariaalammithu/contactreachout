import { beforeEach, describe, expect, it, vi } from 'vitest';
const admin = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('server-only', () => ({})); vi.mock('@/lib/supabase/admin-client', () => ({ getSupabaseAdminClient: admin.get }));
const { assignLeadToCampaign } = await import('@/lib/persistence/lead-repository');
const context = { appUserId: 'user-a', organizationId: 'org-a', emailNormalized: 'a@example.test', role: 'OWNER' };
const scoped = data => ({ select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data, error: null }) }) }) }) }) });
describe('campaign-lead association', () => {
  beforeEach(() => admin.get.mockReset());
  it('rejects a lead outside the resolved organization before insert', async () => {
    const insert = vi.fn(); admin.get.mockReturnValue({ from: vi.fn(table => table === 'app_campaigns' ? scoped({ id: 'campaign-a' }) : table === 'app_leads' ? scoped(null) : { insert }) });
    await expect(assignLeadToCampaign(context, 'campaign-a', 'lead-b')).rejects.toThrow('active organization'); expect(insert).not.toHaveBeenCalled();
  });
  it('surfaces the unique association conflict rather than creating a replacement', async () => {
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'duplicate key' } }) }) })); admin.get.mockReturnValue({ from: vi.fn(table => ['app_campaigns', 'app_leads'].includes(table) ? scoped({ id: table }) : { insert }) });
    await expect(assignLeadToCampaign(context, 'campaign-a', 'lead-a')).rejects.toThrow('already associated'); expect(insert).toHaveBeenCalledTimes(1);
  });
});
