import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { nextAvailableName, normalizeOrganizationName } from './naming';
import type { PersistenceContext } from './identity';

type CampaignInput = { name: string; status?: string; isDryRun?: boolean; settings?: Record<string, unknown>; legacyImportId?: string };

export async function listCampaigns(context: PersistenceContext) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Durable storage is not configured.');
  const result = await client.from('app_campaigns').select('*').eq('organization_id', context.organizationId).is('archived_at', null).order('created_at', { ascending: false });
  if (result.error) throw new Error(`Could not list campaigns: ${result.error.message}`);
  return result.data;
}

/**
 * A unique organization/name_normalized constraint remains the final arbiter.
 * Retrying after a conflict protects concurrent creates without changing an
 * unrelated existing campaign.
 */
export async function createCampaign(context: PersistenceContext, input: CampaignInput) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Durable storage is not configured.');
  const requestedName = input.name.trim();
  if (!requestedName || requestedName.length > 255) throw new Error('Campaign name must be between 1 and 255 characters.');
  if (input.legacyImportId) { const prior = await client.from('app_campaigns').select('*').eq('organization_id', context.organizationId).eq('legacy_source', 'browser-localstorage-v1').eq('legacy_import_id', input.legacyImportId).maybeSingle(); if (prior.error) throw new Error(`Could not reconcile campaign import: ${prior.error.message}`); if (prior.data) return prior.data; }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const existing = await client.from('app_campaigns').select('name_normalized').eq('organization_id', context.organizationId);
    if (existing.error) throw new Error(`Could not validate campaign name: ${existing.error.message}`);
    const name = nextAvailableName(requestedName, (existing.data || []).map((row: { name_normalized: string }) => row.name_normalized));
    const created = await client.from('app_campaigns').insert({
      organization_id: context.organizationId,
      created_by_app_user_id: context.appUserId,
      name,
      name_normalized: normalizeOrganizationName(name),
      status: input.status || 'draft',
      is_dry_run: input.isDryRun ?? true,
      settings: input.settings || {},
      legacy_source: input.legacyImportId ? 'browser-localstorage-v1' : null,
      legacy_import_id: input.legacyImportId || null,
    }).select('*').single();
    if (!created.error) return created.data;
    if (!/unique|duplicate/i.test(created.error.message)) throw new Error(`Could not create campaign: ${created.error.message}`);
  }
  throw new Error('Could not allocate a unique campaign name. Please retry.');
}

export async function archiveCampaign(context: PersistenceContext, campaignId: string) {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Durable storage is not configured.');
  const result = await client.from('app_campaigns').update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', campaignId).eq('organization_id', context.organizationId).is('archived_at', null).select('id').maybeSingle();
  if (result.error) throw new Error(`Could not archive campaign: ${result.error.message}`);
  if (!result.data) throw new Error('Campaign was not found in the active organization.');
}

export async function updateCampaign(context: PersistenceContext, campaignId: string, input: Partial<CampaignInput>) {
  const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.');
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status) updates.status = input.status; if (typeof input.isDryRun === 'boolean') updates.is_dry_run = input.isDryRun; if (input.settings) updates.settings = input.settings;
  if (input.name) { const normalized = normalizeOrganizationName(input.name); const conflict = await client.from('app_campaigns').select('id').eq('organization_id', context.organizationId).eq('name_normalized', normalized).neq('id', campaignId).maybeSingle(); if (conflict.error) throw new Error(`Could not validate campaign name: ${conflict.error.message}`); if (conflict.data) throw new Error('A campaign with this name already exists in the active organization.'); updates.name = input.name.trim(); updates.name_normalized = normalized; }
  const result = await client.from('app_campaigns').update(updates).eq('id', campaignId).eq('organization_id', context.organizationId).is('archived_at', null).select('*').maybeSingle(); if (result.error || !result.data) throw new Error(result.error?.message || 'Campaign was not found in the active organization.'); return result.data;
}
