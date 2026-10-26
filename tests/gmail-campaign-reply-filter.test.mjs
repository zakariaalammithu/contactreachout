import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const client = { from: vi.fn() };
  return { client };
});

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => mocks.client,
}));

const {
  extractSenderEmail,
  normalizeDomain,
  senderDomain,
  matchCampaignLead,
  listCampaignLeadContacts,
  findCampaignLinkForThread,
} = await import('@/lib/services/campaign-reply-matcher');

// Minimal supabase-js thenable: chainable filters, awaitable result.
function makeBuilder(result) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => result,
    then: (resolve) => resolve(result),
  };
  return builder;
}

describe('campaign reply sender matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts addresses from display-name and bare From headers', () => {
    expect(extractSenderEmail('Jane Doe <Jane@Example.com>')).toBe('jane@example.com');
    expect(extractSenderEmail('boss@company.co.uk')).toBe('boss@company.co.uk');
    expect(extractSenderEmail('No Address Here')).toBe('');
  });

  it('normalizes lead domains for comparison', () => {
    expect(normalizeDomain('https://WWW.Example.com/path')).toBe('example.com');
    expect(normalizeDomain('example.com:443')).toBe('example.com');
    expect(normalizeDomain(null)).toBe(null);
    expect(normalizeDomain('')).toBe(null);
  });

  it('derives the sender domain', () => {
    expect(senderDomain('jane@example.com')).toBe('example.com');
    expect(senderDomain('no-at-sign')).toBe(null);
  });

  it('prefers exact email matches over domain matches', () => {
    const contacts = [
      { campaignId: 'camp-domain', leadId: 'lead-domain', email: 'other@example.com', domain: 'example.com' },
      { campaignId: 'camp-exact', leadId: 'lead-exact', email: 'jane@example.com', domain: null },
    ];
    expect(matchCampaignLead(contacts, 'Jane@Example.com')).toEqual({ campaignId: 'camp-exact', leadId: 'lead-exact' });
  });

  it('falls back to domain matches for colleagues at the same company', () => {
    const contacts = [
      { campaignId: 'camp-1', leadId: 'lead-1', email: 'boss@acme.com', domain: 'acme.com' },
    ];
    expect(matchCampaignLead(contacts, 'colleague@acme.com')).toEqual({ campaignId: 'camp-1', leadId: 'lead-1' });
  });

  it('rejects personal mail senders with no campaign link', () => {
    const contacts = [
      { campaignId: 'camp-1', leadId: 'lead-1', email: 'boss@acme.com', domain: 'acme.com' },
    ];
    expect(matchCampaignLead(contacts, 'friend@personalmail.com')).toBe(null);
    expect(matchCampaignLead(contacts, '')).toBe(null);
  });

  it('loads campaign lead contacts across the link and lead tables', async () => {
    mocks.client.from
      .mockImplementationOnce(() => makeBuilder({ data: [{ app_campaign_id: 'camp-1', app_lead_id: 'lead-1' }], error: null }))
      .mockImplementationOnce(() => makeBuilder({ data: [{ id: 'lead-1', email: 'Boss@Acme.com', domain: 'acme.com' }], error: null }));
    const contacts = await listCampaignLeadContacts('org-1');
    expect(contacts).toEqual([{ campaignId: 'camp-1', leadId: 'lead-1', email: 'Boss@Acme.com', domain: 'acme.com' }]);
    expect(mocks.client.from).toHaveBeenCalledWith('app_campaign_leads');
    expect(mocks.client.from).toHaveBeenCalledWith('app_leads');
  });

  it('returns no contacts when the organization has no campaign leads', async () => {
    mocks.client.from.mockImplementationOnce(() => makeBuilder({ data: [], error: null }));
    await expect(listCampaignLeadContacts('org-1')).resolves.toEqual([]);
  });

  it('links an already campaign-linked thread to its campaign', async () => {
    // maybeSingle flows: conversation row, then linked message row.
    const convBuilder = makeBuilder({ data: { id: 'conv-1' }, error: null });
    const msgBuilder = makeBuilder({ data: { app_campaign_id: 'camp-1', app_lead_id: 'lead-1' }, error: null });
    mocks.client.from.mockImplementationOnce(() => convBuilder).mockImplementationOnce(() => msgBuilder);
    await expect(findCampaignLinkForThread({ organizationId: 'org-1', mailboxId: 'box-1', threadId: 'thread-1' })).resolves.toEqual({ campaignId: 'camp-1', leadId: 'lead-1' });
  });

  it('does not link personal threads that carry no campaign mail', async () => {
    const convBuilder = makeBuilder({ data: { id: 'conv-1' }, error: null });
    const msgBuilder = makeBuilder({ data: null, error: null });
    mocks.client.from.mockImplementationOnce(() => convBuilder).mockImplementationOnce(() => msgBuilder);
    await expect(findCampaignLinkForThread({ organizationId: 'org-1', mailboxId: 'box-1', threadId: 'thread-1' })).resolves.toBe(null);
  });

  it('does not link unknown threads', async () => {
    const convBuilder = makeBuilder({ data: null, error: null });
    mocks.client.from.mockImplementationOnce(() => convBuilder);
    await expect(findCampaignLinkForThread({ organizationId: 'org-1', mailboxId: 'box-1', threadId: 'thread-1' })).resolves.toBe(null);
  });
});
