import 'server-only';

import { createCampaign } from '@/lib/persistence/campaign-repository';
import { assignLeadToCampaign, createLead } from '@/lib/persistence/lead-repository';
import type { PersistenceContext } from '@/lib/persistence/identity';
import { normalizeDomain } from './campaign-reply-matcher';

export type CampaignReplyLeadInput = {
  id?: string;
  company_name?: string;
  website?: string;
  email?: string;
};

/**
 * Best-effort durable reply link (2026-11-01 fix for "replies never arrive").
 *
 * Root cause, proven by counts: the inbox filter matches replies against
 * Supabase campaign leads (app_campaign_leads), but campaigns run from the
 * browser's localStorage and never wrote those rows — app_campaign_leads
 * held 0 rows, so every prospect reply was filtered out no matter how
 * healthy Gmail sync was. Registering the processed prospect here, keyed by
 * the client campaign id and the lead id/domain (both idempotent through the
 * repositories' legacy-import reconciliation), is what lets a later reply
 * from that prospect's domain match at all.
 *
 * Never throws into the outreach path: a durable-identity or Supabase
 * failure simply means this lead's replies keep being filtered until a
 * later run registers it. Dry runs never register (nothing was sent, so no
 * reply can come) — the caller gates on that.
 */
export async function ensureCampaignReplyLink(
  context: PersistenceContext,
  input: {
    clientCampaignId: string;
    campaignName?: string;
    lead: CampaignReplyLeadInput;
  },
): Promise<void> {
  try {
    const domain = normalizeDomain(input.lead.website);
    if (!input.clientCampaignId || !domain) return;
    const campaign = await createCampaign(context, {
      name: (input.campaignName || '').trim() || `Campaign ${input.clientCampaignId}`,
      status: 'active',
      isDryRun: false,
      legacyImportId: `campaign:${input.clientCampaignId}`,
    });
    const leadKey = (input.lead.id || '').trim() || domain;
    const leadRow = await createLead(context, {
      companyName: input.lead.company_name || undefined,
      domain,
      website: input.lead.website || undefined,
      email: (input.lead.email || '').trim() || undefined,
      legacyImportId: `campaign-lead:${input.clientCampaignId}:${leadKey}`,
    });
    if (!campaign?.id || !leadRow?.id) return;
    try {
      await assignLeadToCampaign(context, campaign.id, leadRow.id);
    } catch (error) {
      // Re-processing the same lead re-hits the unique link; that is the
      // idempotent case, not a failure.
      if (!(error instanceof Error) || !/already associated/i.test(error.message)) throw error;
    }
  } catch {
    // Best-effort only: the outreach result stands on its own.
  }
}
