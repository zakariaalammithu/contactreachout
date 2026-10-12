import 'server-only';
import crypto from 'crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import type { PersistenceContext } from './identity';
import { createCampaign } from './campaign-repository';
import { createLeadList } from './lead-list-repository';
import { createLead, assignLeadToCampaign } from './lead-repository';

export type LegacyExport = { campaigns: Record<string, unknown>[]; leads: Record<string, unknown>[]; leadLists: Record<string, unknown>[] };
const source = 'browser-localstorage-v1';
const hash = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const email = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validOwner = (record: Record<string, unknown>, context: PersistenceContext) => email(record.ownerEmail) === context.emailNormalized;

export async function createImportPreview(context: PersistenceContext, data: LegacyExport) {
  const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.');
  const all = [['campaign', data.campaigns], ['lead', data.leads], ['lead-list', data.leadLists]] as const;
  let invalidOwners = 0; let malformed = 0; let duplicates = 0; const seen = new Set<string>();
  const items = all.flatMap(([type, records]) => records.map((record) => {
    const recordHash = hash(record); const sourceId = typeof record.id === 'string' ? record.id : null;
    const duplicate = seen.has(`${type}:${sourceId || recordHash}`); seen.add(`${type}:${sourceId || recordHash}`);
    const bad = !record || typeof record !== 'object' || !validOwner(record, context);
    if (duplicate) duplicates += 1; if (bad) invalidOwners += 1;
    if (!record || typeof record !== 'object') malformed += 1;
    return { source_type: type, source_record_id: sourceId, source_record_hash: recordHash, disposition: bad ? 'QUARANTINED' : duplicate ? 'DUPLICATE' : 'READY', error_detail: bad ? 'OWNER_MISSING_INVALID_OR_CONFLICTING' : duplicate ? 'DUPLICATE_SOURCE_RECORD' : null };
  }));
  let nestedProspects = 0; let malformedNestedProspects = 0; let eligibleAssociations = 0;
  for (const campaign of data.campaigns) {
    const prospects = Array.isArray(campaign.prospectsList) ? campaign.prospectsList : [];
    nestedProspects += prospects.length;
    if (!validOwner(campaign, context)) continue;
    for (const prospect of prospects) {
      if (!prospect || typeof prospect !== 'object') { malformedNestedProspects += 1; continue; }
      eligibleAssociations += 1;
    }
  }
  const nestedItems = data.campaigns.flatMap((campaign) => {
    const campaignIdentity = typeof campaign.id === 'string' && campaign.id.trim() ? campaign.id.trim() : hash(campaign);
    const prospects = Array.isArray(campaign.prospectsList) ? campaign.prospectsList : [];
    return prospects.map((prospect) => {
      if (!prospect || typeof prospect !== 'object') return { source_type: 'campaign-prospect', source_record_id: `${campaignIdentity}:malformed`, source_record_hash: hash({ campaignIdentity, prospect }), disposition: 'QUARANTINED', error_detail: 'MALFORMED_NESTED_PROSPECT' };
      const nested = prospect as Record<string, unknown>; const prospectIdentity = typeof nested.id === 'string' && nested.id.trim() ? nested.id.trim() : hash(nested);
      const reason = !validOwner(campaign, context) ? 'CAMPAIGN_OWNER_MISSING_INVALID_OR_CONFLICTING' : null;
      return { source_type: 'campaign-prospect', source_record_id: `${campaignIdentity}:prospect:${prospectIdentity}`, source_record_hash: hash({ campaignIdentity, prospectIdentity, nested }), disposition: reason ? 'QUARANTINED' : 'READY', error_detail: reason };
    });
  });
  const associationItems = data.leads.filter(lead => typeof lead.campaignId === 'string' && typeof lead.id === 'string').map(lead => ({ source_type: 'lead-campaign-association', source_record_id: `${lead.campaignId}:lead:${lead.id}`, source_record_hash: hash({ campaignId: lead.campaignId, leadId: lead.id }), disposition: validOwner(lead, context) ? 'READY' : 'QUARANTINED', error_detail: validOwner(lead, context) ? null : 'OWNER_MISSING_INVALID_OR_CONFLICTING' }));
  const allItems = [...items, ...nestedItems, ...associationItems];
  const summary = { payloadHash: hash(data), validRecords: allItems.filter(i => i.disposition === 'READY').length, invalidOwners, malformed, duplicates, campaigns: data.campaigns.length, leads: data.leads.length, leadLists: data.leadLists.length, nestedProspects, malformedNestedProspects, eligibleAssociations, topLevelAssociations: associationItems.length, nestedReady: nestedItems.filter(i => i.disposition === 'READY').length, nestedQuarantined: nestedItems.filter(i => i.disposition === 'QUARANTINED').length, skippedReasons: { ownerConflict: invalidOwners, malformedTopLevel: malformed, duplicateSource: duplicates, malformedNestedProspect: malformedNestedProspects } };
  const batch = await client.from('app_legacy_import_batches').insert({ organization_id: context.organizationId, requested_by_app_user_id: context.appUserId, source, status: 'PREVIEWED', preview_summary: summary }).select('id, preview_summary, status').single();
  if (batch.error) throw new Error(`Could not save import preview: ${batch.error.message}`);
  if (allItems.length) { const inserted = await client.from('app_legacy_import_items').insert(allItems.map(i => ({ ...i, batch_id: batch.data.id }))); if (inserted.error) throw new Error(`Could not save import preview items: ${inserted.error.message}`); }
  return { batch: batch.data, summary };
}

export async function approveAndImport(context: PersistenceContext, batchId: string, data: LegacyExport) {
  const client = getSupabaseAdminClient(); if (!client) throw new Error('Durable storage is not configured.');
  const batch = await client.from('app_legacy_import_batches').select('*').eq('id', batchId).eq('organization_id', context.organizationId).eq('requested_by_app_user_id', context.appUserId).maybeSingle();
  if (batch.error || !batch.data) throw new Error('Import batch was not found in the active organization.');
  const summary = batch.data.preview_summary as { payloadHash?: string }; if (summary.payloadHash !== hash(data)) throw new Error('The import payload differs from the approved preview. Generate a new preview.');
  if (batch.data.status === 'COMPLETED') return { status: 'COMPLETED', idempotent: true };
  const mark = await client.from('app_legacy_import_batches').update({ status: 'RUNNING', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', batchId).in('status', ['PREVIEWED', 'APPROVED', 'FAILED']); if (mark.error) throw new Error(`Could not approve import batch: ${mark.error.message}`);
  const campaignIds = new Map<string, string>(); const leadIds = new Map<string, string>(); const listIds = new Map<string, string>();
  const importOne = async (type: string, record: Record<string, unknown>, action: () => Promise<{ id: string }>) => {
    const recordHash = hash(record); if (!validOwner(record, context)) return;
    const item = await client.from('app_legacy_import_items').select('id, disposition, target_record_id').eq('batch_id', batchId).eq('source_type', type).eq('source_record_hash', recordHash).maybeSingle();
    if (item.error || !item.data || item.data.disposition !== 'READY') return;
    try { const created = await action(); await client.from('app_legacy_import_items').update({ disposition: 'IMPORTED', target_record_id: created.id, updated_at: new Date().toISOString() }).eq('id', item.data.id); }
    catch (error) { await client.from('app_legacy_import_items').update({ disposition: 'FAILED', error_detail: error instanceof Error ? error.message.slice(0, 1000) : 'IMPORT_FAILED', updated_at: new Date().toISOString() }).eq('id', item.data.id); }
  };
  for (const record of data.leadLists) await importOne('lead-list', record, async () => { const created = await createLeadList(context, String(record.name || 'Imported Lead List'), String(record.id || hash(record))); if (typeof record.id === 'string') listIds.set(record.id, created.id); return created; });
  for (const record of data.campaigns) await importOne('campaign', record, async () => { const created = await createCampaign(context, { name: String(record.name || 'Imported Campaign'), status: typeof record.status === 'string' ? record.status : undefined, legacyImportId: String(record.id || hash(record)) }); if (typeof record.id === 'string') campaignIds.set(record.id, created.id); return created; });
  for (const record of data.leads) await importOne('lead', record, async () => { const listId = typeof record.listId === 'string' ? listIds.get(record.listId) : undefined; const created = await createLead(context, { companyName: typeof record.companyName === 'string' ? record.companyName : undefined, domain: typeof record.domain === 'string' ? record.domain : undefined, website: typeof record.website === 'string' ? record.website : undefined, email: typeof record.email === 'string' ? record.email : undefined, listId, status: typeof record.status === 'string' ? record.status : undefined, legacyImportId: String(record.id || hash(record)) }); if (typeof record.id === 'string') leadIds.set(record.id, created.id); return created; });
  for (const campaign of data.campaigns) {
    const campaignId = typeof campaign.id === 'string' ? campaignIds.get(campaign.id) : undefined;
    const prospects = Array.isArray(campaign.prospectsList) ? campaign.prospectsList : [];
    if (!campaignId || !validOwner(campaign, context)) continue;
    for (const prospect of prospects) {
      const campaignIdentity = typeof campaign.id === 'string' && campaign.id.trim() ? campaign.id.trim() : hash(campaign);
      if (!prospect || typeof prospect !== 'object') continue;
      const nested = prospect as Record<string, unknown>;
      const sourceId = String(nested.id || hash(nested));
      const nestedHash = hash({ campaignIdentity, prospectIdentity: sourceId, nested });
      const audit = await client.from('app_legacy_import_items').select('id, disposition').eq('batch_id', batchId).eq('source_type', 'campaign-prospect').eq('source_record_hash', nestedHash).maybeSingle();
      if (audit.error || !audit.data || audit.data.disposition !== 'READY') continue;
      let leadId = leadIds.get(sourceId);
      if (!leadId) {
        try { const lead = await createLead(context, { companyName: typeof nested.companyName === 'string' ? nested.companyName : undefined, domain: typeof nested.domain === 'string' ? nested.domain : undefined, website: typeof nested.website === 'string' ? nested.website : undefined, email: typeof nested.email === 'string' ? nested.email : undefined, status: typeof nested.status === 'string' ? nested.status : undefined, legacyImportId: `nested:${sourceId}` }); leadId = lead.id; leadIds.set(sourceId, lead.id); }
        catch (error) { await client.from('app_legacy_import_items').update({ disposition: 'FAILED', error_detail: error instanceof Error ? error.message.slice(0, 1000) : 'NESTED_LEAD_IMPORT_FAILED', updated_at: new Date().toISOString() }).eq('id', audit.data.id); continue; }
      }
      if (leadId) { try { await assignLeadToCampaign(context, campaignId, leadId); await client.from('app_legacy_import_items').update({ disposition: 'IMPORTED', target_record_id: leadId, updated_at: new Date().toISOString() }).eq('id', audit.data.id); } catch { await client.from('app_legacy_import_items').update({ disposition: 'DUPLICATE', target_record_id: leadId, error_detail: 'CAMPAIGN_LEAD_ASSOCIATION_EXISTS', updated_at: new Date().toISOString() }).eq('id', audit.data.id); } }
    }
  }
  for (const record of data.leads) { const campaignId = typeof record.campaignId === 'string' ? campaignIds.get(record.campaignId) : undefined; const leadId = typeof record.id === 'string' ? leadIds.get(record.id) : undefined; if (campaignId && leadId && validOwner(record, context)) { const associationHash = hash({ campaignId: record.campaignId, leadId: record.id }); const audit = await client.from('app_legacy_import_items').select('id, disposition').eq('batch_id', batchId).eq('source_type', 'lead-campaign-association').eq('source_record_hash', associationHash).maybeSingle(); if (!audit.error && audit.data?.disposition === 'READY') { try { await assignLeadToCampaign(context, campaignId, leadId); await client.from('app_legacy_import_items').update({ disposition: 'IMPORTED', target_record_id: leadId, updated_at: new Date().toISOString() }).eq('id', audit.data.id); } catch { const existing = await client.from('app_campaign_leads').select('id').eq('organization_id', context.organizationId).eq('app_campaign_id', campaignId).eq('app_lead_id', leadId).maybeSingle(); await client.from('app_legacy_import_items').update({ disposition: existing.data ? 'DUPLICATE' : 'FAILED', target_record_id: existing.data ? leadId : null, error_detail: existing.data ? 'CAMPAIGN_LEAD_ASSOCIATION_EXISTS' : 'CAMPAIGN_LEAD_ASSOCIATION_FAILED', updated_at: new Date().toISOString() }).eq('id', audit.data.id); } } } }
  const result = await client.from('app_legacy_import_batches').update({ status: 'COMPLETED', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', batchId); if (result.error) throw new Error(`Could not complete import batch: ${result.error.message}`);
  return { status: 'COMPLETED', idempotent: false };
}
