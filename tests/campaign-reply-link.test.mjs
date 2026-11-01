import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = { queue: [], inserts: [] };
  function makeBuilder(table) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      is: () => builder,
      order: () => builder,
      in: () => builder,
      not: () => builder,
      insert: (row) => {
        state.inserts.push({ table, row });
        return builder;
      },
      upsert: (row) => {
        state.inserts.push({ table, row });
        return builder;
      },
      maybeSingle: async () => state.queue.shift() ?? { data: null },
      single: async () => state.queue.shift() ?? { data: null },
      then: (resolve) => resolve(state.queue.shift() ?? { data: [] }),
    };
    return builder;
  }
  const client = { from: vi.fn((table) => makeBuilder(table)) };
  return { state, client, baseClient: client };
});

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => mocks.client,
}));

const { ensureCampaignReplyLink } = await import('@/lib/services/campaign-reply-link');

const context = {
  appUserId: 'user-1',
  organizationId: 'org-1',
  role: 'OWNER',
  emailNormalized: 'owner@example.com',
};

function setClient(client) {
  mocks.client = client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.queue = [];
  mocks.state.inserts = [];
  mocks.client = mocks.baseClient;
  // The hoisted client object is reused; restore its from() implementation.
  mocks.client.from = vi.fn((table) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      is: () => builder,
      order: () => builder,
      in: () => builder,
      not: () => builder,
      insert: (row) => {
        mocks.state.inserts.push({ table, row });
        return builder;
      },
      upsert: (row) => {
        mocks.state.inserts.push({ table, row });
        return builder;
      },
      maybeSingle: async () => mocks.state.queue.shift() ?? { data: null },
      single: async () => mocks.state.queue.shift() ?? { data: null },
      then: (resolve) => resolve(mocks.state.queue.shift() ?? { data: [] }),
    };
    return builder;
  });
});

describe('ensureCampaignReplyLink', () => {
  it('registers the campaign, lead and link with stable legacy ids', async () => {
    mocks.state.queue = [
      { data: null }, // campaign prior check
      { data: [] }, // campaign name availability
      { data: { id: 'camp-uuid' } }, // campaign insert
      { data: null }, // lead prior check
      { data: { id: 'lead-uuid' } }, // lead insert
      { data: { id: 'camp-uuid' } }, // assign: campaign exists
      { data: { id: 'lead-uuid' } }, // assign: lead exists
      { data: { id: 'link-uuid' } }, // link insert
    ];
    await ensureCampaignReplyLink(context, {
      clientCampaignId: 'camp-123',
      campaignName: 'Test Campaign',
      lead: { id: 'lead-1', company_name: 'B2BGDC', website: 'https://b2bgdc.com/contact', email: '' },
    });
    const campaignInsert = mocks.state.inserts.find((i) => i.table === 'app_campaigns');
    const leadInsert = mocks.state.inserts.find((i) => i.table === 'app_leads');
    const linkInsert = mocks.state.inserts.find((i) => i.table === 'app_campaign_leads');
    expect(campaignInsert.row.legacy_import_id).toBe('campaign:camp-123');
    expect(campaignInsert.row.name).toBe('Test Campaign');
    expect(leadInsert.row.domain).toBe('b2bgdc.com');
    expect(leadInsert.row.legacy_import_id).toBe('campaign-lead:camp-123:lead-1');
    expect(linkInsert.row.app_campaign_id).toBe('camp-uuid');
    expect(linkInsert.row.app_lead_id).toBe('lead-uuid');
  });

  it('falls back to the domain as the lead key when the lead has no id', async () => {
    mocks.state.queue = [
      { data: null },
      { data: [] },
      { data: { id: 'camp-uuid' } },
      { data: null },
      { data: { id: 'lead-uuid' } },
      { data: { id: 'camp-uuid' } },
      { data: { id: 'lead-uuid' } },
      { data: { id: 'link-uuid' } },
    ];
    await ensureCampaignReplyLink(context, {
      clientCampaignId: 'camp-123',
      campaignName: 'Test Campaign',
      lead: { company_name: 'B2BGDC', website: 'b2bgdc.com' },
    });
    const leadInsert = mocks.state.inserts.find((i) => i.table === 'app_leads');
    expect(leadInsert.row.legacy_import_id).toBe('campaign-lead:camp-123:b2bgdc.com');
  });

  it('treats a duplicate link as the idempotent case, not a failure', async () => {
    mocks.state.queue = [
      { data: null },
      { data: [] },
      { data: { id: 'camp-uuid' } },
      { data: null },
      { data: { id: 'lead-uuid' } },
      { data: { id: 'camp-uuid' } },
      { data: { id: 'lead-uuid' } },
      { error: { message: 'duplicate key value violates unique constraint' } },
    ];
    await expect(
      ensureCampaignReplyLink(context, {
        clientCampaignId: 'camp-123',
        campaignName: 'Test Campaign',
        lead: { id: 'lead-1', company_name: 'B2BGDC', website: 'https://b2bgdc.com' },
      }),
    ).resolves.toBeUndefined();
  });

  it('never throws when durable storage is unavailable', async () => {
    setClient(null);
    await expect(
      ensureCampaignReplyLink(context, {
        clientCampaignId: 'camp-123',
        campaignName: 'Test Campaign',
        lead: { id: 'lead-1', company_name: 'B2BGDC', website: 'https://b2bgdc.com' },
      }),
    ).resolves.toBeUndefined();
  });

  it('does nothing without a website', async () => {
    await ensureCampaignReplyLink(context, {
      clientCampaignId: 'camp-123',
      campaignName: 'Test Campaign',
      lead: { id: 'lead-1', company_name: 'B2BGDC', website: '' },
    });
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
});
