import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

/**
 * Manyreach-style inbox rule: only mail that answers ContactReachout outreach
 * may enter the durable inbox. A campaign sends contact-FORM submissions, not
 * email, so a prospect's email reply arrives as a fresh thread — it cannot be
 * matched by In-Reply-To headers. Matching is therefore by sender:
 *
 * 1. The thread already belongs to a campaign-linked conversation (an ongoing
 *    campaign thread keeps working even if a colleague replies from another
 *    address at the same company).
 * 2. Otherwise the sender's email — or the sender's domain — matches a lead
 *    attached to one of the organization's campaigns.
 *
 * Anything else is personal mail and must be filtered out, never imported.
 */

export type CampaignLeadContact = {
  campaignId: string;
  leadId: string;
  email: string | null;
  domain: string | null;
};

export type CampaignLink = {
  campaignId: string;
  leadId: string;
};

/** Extracts the address from `Name <a@b.com>` or a bare address; '' when none. */
export function extractSenderEmail(from: string): string {
  const angled = from.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  const raw = (angled ? angled[1] : from).trim().toLowerCase();
  return raw.includes('@') ? raw : '';
}

/** Normalizes a lead domain (`https://WWW.Example.com/path` -> `example.com`). */
export function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  let host = value.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, '').replace(/^www\./, '');
  host = host.split(/[/:?#]/)[0] || '';
  return host || null;
}

export function senderDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0) return null;
  return email.slice(at + 1) || null;
}

/**
 * Pure match: an exact sender-email match wins; otherwise a sender-domain
 * match against a lead's domain. Returns null when the sender is not a
 * campaign contact at all.
 */
export function matchCampaignLead(
  contacts: CampaignLeadContact[],
  senderEmail: string,
): CampaignLink | null {
  const sender = senderEmail.trim().toLowerCase();
  if (!sender) return null;
  for (const contact of contacts) {
    if (contact.email && contact.email.trim().toLowerCase() === sender) {
      return { campaignId: contact.campaignId, leadId: contact.leadId };
    }
  }
  const domain = senderDomain(sender);
  if (!domain) return null;
  for (const contact of contacts) {
    if (normalizeDomain(contact.domain) === domain) {
      return { campaignId: contact.campaignId, leadId: contact.leadId };
    }
  }
  return null;
}

function clientOrThrow() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Durable mailbox storage is not configured.');
  return client;
}

/** Every lead attached to any campaign of the organization. */
export async function listCampaignLeadContacts(
  organizationId: string,
): Promise<CampaignLeadContact[]> {
  const client = clientOrThrow();
  const links = await client
    .from('app_campaign_leads')
    .select('app_campaign_id, app_lead_id')
    .eq('organization_id', organizationId);
  if (links.error) throw new Error('CAMPAIGN_LEAD_LOOKUP_FAILED');
  const rows = (links.data || []) as Array<{ app_campaign_id: string; app_lead_id: string }>;
  if (!rows.length) return [];
  const leadIds = [...new Set(rows.map((row) => row.app_lead_id))];
  const leads = await client
    .from('app_leads')
    .select('id, email, domain')
    .eq('organization_id', organizationId)
    .in('id', leadIds);
  if (leads.error) throw new Error('CAMPAIGN_LEAD_LOOKUP_FAILED');
  const byId = new Map(
    ((leads.data || []) as Array<{ id: string; email: string | null; domain: string | null }>).map(
      (lead) => [lead.id, lead] as const,
    ),
  );
  const contacts: CampaignLeadContact[] = [];
  for (const row of rows) {
    const lead = byId.get(row.app_lead_id);
    if (lead) {
      contacts.push({
        campaignId: row.app_campaign_id,
        leadId: row.app_lead_id,
        email: lead.email ?? null,
        domain: lead.domain ?? null,
      });
    }
  }
  return contacts;
}

/**
 * Returns the campaign link of a thread that already carries campaign mail,
 * or null when the thread is not a campaign thread (personal mail included).
 */
export async function findCampaignLinkForThread(input: {
  organizationId: string;
  mailboxId: string;
  threadId: string;
}): Promise<CampaignLink | null> {
  const client = clientOrThrow();
  const conversation = await client
    .from('app_inbox_conversations')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('connected_mailbox_id', input.mailboxId)
    .eq('provider_thread_id', input.threadId)
    .maybeSingle();
  if (conversation.error || !conversation.data) return null;
  const linked = await client
    .from('app_inbox_messages')
    .select('app_campaign_id, app_lead_id')
    .eq('organization_id', input.organizationId)
    .eq('app_inbox_conversation_id', (conversation.data as { id: string }).id)
    .not('app_campaign_id', 'is', null)
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (linked.error || !linked.data) return null;
  const row = linked.data as { app_campaign_id: string | null; app_lead_id: string | null };
  if (!row.app_campaign_id || !row.app_lead_id) return null;
  return { campaignId: row.app_campaign_id, leadId: row.app_lead_id };
}
