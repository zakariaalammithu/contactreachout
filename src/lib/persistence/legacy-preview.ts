import 'server-only';

import crypto from 'crypto';

export type LegacyPreview = { campaigns: number; leads: number; leadLists: number; invalidOwners: number; duplicateIds: number; namingConflicts: string[] };

const hash = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalized = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';

/** Pure validation: it intentionally performs no database writes. */
export function previewLegacyBrowserData(input: { ownerEmail: string; campaigns?: unknown[]; leads?: unknown[]; leadLists?: unknown[] }): LegacyPreview {
  const owner = normalized(input.ownerEmail);
  const seen = new Set<string>();
  let invalidOwners = 0;
  let duplicateIds = 0;
  const namingConflicts: string[] = [];
  const inspect = (records: unknown[], kind: string) => records.forEach((record) => {
    const item = record && typeof record === 'object' ? record as Record<string, unknown> : {};
    const itemOwner = normalized(item.ownerEmail);
    if (!itemOwner || itemOwner !== owner) invalidOwners += 1;
    const key = `${kind}:${String(item.id || hash(item))}`;
    if (seen.has(key)) duplicateIds += 1;
    seen.add(key);
  });
  const campaignNames = new Set<string>();
  for (const record of input.campaigns || []) {
    const name = normalized((record as Record<string, unknown>)?.name);
    if (name && campaignNames.has(name)) namingConflicts.push(String((record as Record<string, unknown>).name));
    campaignNames.add(name);
  }
  const listNames = new Set<string>();
  for (const record of input.leadLists || []) {
    const name = normalized((record as Record<string, unknown>)?.name);
    if (name && listNames.has(name)) namingConflicts.push(String((record as Record<string, unknown>).name));
    listNames.add(name);
  }
  inspect(input.campaigns || [], 'campaign'); inspect(input.leads || [], 'lead'); inspect(input.leadLists || [], 'lead-list');
  return { campaigns: input.campaigns?.length || 0, leads: input.leads?.length || 0, leadLists: input.leadLists?.length || 0, invalidOwners, duplicateIds, namingConflicts };
}
