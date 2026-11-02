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
 * Best-effort durable campaign-lead registration (2026-11-01 fix for "replies never arrive";
 * 2026-11-02 moved to start-time for worker authorization).
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
 * Second purpose (2026-11-02): the worker's dynamic allow-list verifies
 * targets against these same rows, so the registration MUST happen before
 * any worker call — the process route calls this before the pipeline, for
 * live and dry runs alike (dry-run detection still calls the worker, and
 * an unsent lead can never attract a reply, so registering it is harmless).
 * A caller that registers only after the pipeline reintroduces the
 * first-run 400 failure for every new domain; do not move this back.
 *
 * Never throws into the outreach path: a durable-identity or Supabase
 * failure simply means this lead's replies keep being filtered (and the
 * worker may still refuse the target) until a later run registers it.
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
