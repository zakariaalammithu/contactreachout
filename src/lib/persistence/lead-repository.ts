import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import type { PersistenceContext } from './identity';

export type LeadInput = { companyName?: string; domain?: string; website?: string; contactPerson?: string; title?: string; email?: string; industry?: string; location?: string; listId?: string; status?: string; legacyImportId?: string };

export async function listLeads(context: PersistenceContext) {
  const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.');
  const result = await client.from('app_leads').select('*').eq('organization_id', context.organizationId).is('archived_at', null).order('created_at', { ascending: false });
  if (result.error) throw new Error(`Could not list leads: ${result.error.message}`); return result.data;
}
export async function createLead(context: PersistenceContext, input: LeadInput) {
  const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.');
  if (input.legacyImportId) { const prior = await client.from('app_leads').select('*').eq('organization_id', context.organizationId).eq('legacy_source', 'browser-localstorage-v1').eq('legacy_import_id', input.legacyImportId).maybeSingle(); if (prior.error) throw new Error(`Could not reconcile lead import: ${prior.error.message}`); if (prior.data) return prior.data; }
  if (input.listId) { const list = await client.from('app_lead_lists').select('id').eq('id', input.listId).eq('organization_id', context.organizationId).is('archived_at', null).maybeSingle(); if (list.error || !list.data) throw new Error('Lead list was not found in the active organization.'); }
  const result = await client.from('app_leads').insert({ organization_id: context.organizationId, created_by_app_user_id: context.appUserId, app_lead_list_id: input.listId || null, company_name: input.companyName || null, domain: input.domain || null, website: input.website || null, contact_person: input.contactPerson || null, title: input.title || null, email: input.email?.trim().toLowerCase() || null, industry: input.industry || null, location: input.location || null, status: input.status || 'UNCONTACTED', legacy_source: input.legacyImportId ? 'browser-localstorage-v1' : null, legacy_import_id: input.legacyImportId || null }).select('*').single();
  if (result.error) throw new Error(`Could not create lead: ${result.error.message}`); return result.data;
}
export async function archiveLead(context: PersistenceContext, id: string) {
  const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.');
  const result = await client.from('app_leads').update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', context.organizationId).is('archived_at', null).select('id').maybeSingle();
  if (result.error || !result.data) throw new Error('Lead was not found in the active organization.');
}
export async function updateLead(context: PersistenceContext, id: string, input: LeadInput) { const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.'); const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }; const map: Record<string, string> = { companyName: 'company_name', domain: 'domain', website: 'website', contactPerson: 'contact_person', title: 'title', email: 'email', industry: 'industry', location: 'location', status: 'status' }; for (const [key, column] of Object.entries(map)) { const value = input[key as keyof LeadInput]; if (value !== undefined) updates[column] = key === 'email' ? String(value).trim().toLowerCase() : value; } const r = await client.from('app_leads').update(updates).eq('id', id).eq('organization_id', context.organizationId).is('archived_at', null).select('*').maybeSingle(); if (r.error || !r.data) throw new Error(r.error?.message || 'Lead was not found in the active organization.'); return r.data; }
export async function assignLeadToCampaign(context: PersistenceContext, campaignId: string, leadId: string) {
  const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.');
  const [campaign, lead] = await Promise.all([client.from('app_campaigns').select('id').eq('id', campaignId).eq('organization_id', context.organizationId).is('archived_at', null).maybeSingle(), client.from('app_leads').select('id').eq('id', leadId).eq('organization_id', context.organizationId).is('archived_at', null).maybeSingle()]);
  if (campaign.error || lead.error || !campaign.data || !lead.data) throw new Error('Campaign and lead must both belong to the active organization.');
  const result = await client.from('app_campaign_leads').insert({ organization_id: context.organizationId, app_campaign_id: campaignId, app_lead_id: leadId }).select('*').single();
  if (result.error) { if (/unique|duplicate/i.test(result.error.message)) throw new Error('Lead is already associated with this campaign.'); throw new Error(`Could not associate lead: ${result.error.message}`); } return result.data;
}
