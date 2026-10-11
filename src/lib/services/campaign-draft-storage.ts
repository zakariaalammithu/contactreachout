export const CAMPAIGN_DRAFT_STORAGE_KEY = 'user_campaigns';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readCampaignDrafts(storage: BrowserStorage): any[] {
  const raw = storage.getItem(CAMPAIGN_DRAFT_STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Saved campaign data is corrupted. Existing campaigns were not changed.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Saved campaign data has an invalid format. Existing campaigns were not changed.');
  }

  return parsed;
}

export function createUniqueCampaignId(campaigns: any[], timestamp = Date.now()): string {
  const baseId = `camp-${timestamp}`;
  const existingIds = new Set(campaigns.map((campaign) => String(campaign?.id || '')).filter(Boolean));
  let candidate = baseId;
  let suffix = 1;

  while (existingIds.has(candidate)) candidate = `${baseId}-${suffix++}`;
  return candidate;
}

/**
 * Writes a new draft atomically from the caller's point of view: the caller
 * only receives success after the exact campaign ID can be read back.
 */
export function persistCampaignDraft(storage: BrowserStorage, draft: Record<string, any>): any[] {
  const campaigns = readCampaignDrafts(storage);
  if (!draft?.id) throw new Error('Campaign draft is missing an ID.');
  if (campaigns.some((campaign) => campaign?.id === draft.id)) {
    throw new Error('A campaign with this draft ID already exists. Please try again.');
  }

  const updated = [draft, ...campaigns];
  storage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, JSON.stringify(updated));

  const persisted = readCampaignDrafts(storage);
  if (!persisted.some((campaign) => campaign?.id === draft.id)) {
    throw new Error('Browser storage could not verify the saved campaign draft.');
  }

  return persisted;
}
