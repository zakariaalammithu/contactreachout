export const CAMPAIGN_DRAFT_STORAGE_KEY = 'user_campaigns';
export const DELETED_CAMPAIGN_IDS_STORAGE_KEY = 'user_deleted_campaign_ids';

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface BrowserStorageUsageEntry {
  key: string;
  bytes: number;
}

export interface CampaignDeletionResult {
  campaigns: any[];
  deletedIds: string[];
}

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

  const deletedIds = new Set(parseStringArray(storage.getItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY)));
  return parsed.filter((campaign) => !deletedIds.has(String(campaign?.id || '')));
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

/**
 * Persists a campaign snapshot without allowing a stale component to recreate
 * IDs that have durable deletion markers.
 */
export function writeCampaignDrafts(storage: BrowserStorage, campaigns: any[]): any[] {
  if (!Array.isArray(campaigns)) throw new Error('Campaign data must be an array.');
  const deletedIds = new Set(parseStringArray(storage.getItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY)));
  const filtered = campaigns.filter((campaign) => !deletedIds.has(String(campaign?.id || '')));
  storage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, JSON.stringify(filtered));
  return readCampaignDrafts(storage);
}

/**
 * Removes campaigns from the authoritative browser collection before updating
 * the legacy tombstone list. This order matters when localStorage is at quota:
 * shrinking user_campaigns creates room instead of failing on a growing
 * tombstone write and leaving the campaign able to reappear after refresh.
 */
export function removeCampaignDrafts(storage: BrowserStorage, campaignIds: string[]): CampaignDeletionResult {
  const requestedIds = Array.from(new Set(campaignIds.map(String).filter(Boolean)));
  if (requestedIds.length === 0) return { campaigns: readCampaignDrafts(storage), deletedIds: [] };

  const requested = new Set(requestedIds);
  const campaigns = readCampaignDrafts(storage);
  const updated = campaigns.filter((campaign) => !requested.has(String(campaign?.id || '')));
  const originalCampaignsRaw = storage.getItem(CAMPAIGN_DRAFT_STORAGE_KEY);
  const originalDeletedRaw = storage.getItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY);

  storage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, JSON.stringify(updated));
  const existingDeleted = parseStringArray(originalDeletedRaw);
  const updatedDeleted = Array.from(new Set([...existingDeleted, ...requestedIds]));

  try {
    storage.setItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY, JSON.stringify(updatedDeleted));
    const persisted = readCampaignDrafts(storage);
    const verifiedDeleted = parseStringArray(storage.getItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY));
    if (persisted.some((campaign) => requested.has(String(campaign?.id || ''))) || requestedIds.some((id) => !verifiedDeleted.includes(id))) {
      throw new Error('Browser storage could not verify the campaign deletion.');
    }
    return { campaigns: persisted, deletedIds: updatedDeleted };
  } catch (error) {
    // Do not show a successful deletion unless both the collection update and
    // resurrection guard are durable. Restore the exact prior values when the
    // second write fails.
    if (originalCampaignsRaw !== null) storage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, originalCampaignsRaw);
    else storage.removeItem(CAMPAIGN_DRAFT_STORAGE_KEY);
    if (originalDeletedRaw !== null) storage.setItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY, originalDeletedRaw);
    else storage.removeItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY);
    throw error;
  }
}

/** Returns key names and approximate UTF-16 storage size, never stored values. */
export function getBrowserStorageUsage(storage: Storage): BrowserStorageUsageEntry[] {
  const usage: BrowserStorageUsageEntry[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    const value = storage.getItem(key) || '';
    usage.push({ key, bytes: (key.length + value.length) * 2 });
  }
  return usage.sort((a, b) => b.bytes - a.bytes);
}

export function formatStoragePressureMessage(storage: Storage): string {
  const usage = getBrowserStorageUsage(storage);
  const totalBytes = usage.reduce((total, entry) => total + entry.bytes, 0);
  const largest = usage.slice(0, 4).map((entry) => `${entry.key} (${formatBytes(entry.bytes)})`).join(', ');
  return `Browser storage is full (approximately ${formatBytes(totalBytes)} used). No campaign draft was created. Largest storage categories: ${largest || 'unavailable'}. Delete only campaigns or imports you no longer need, then try again.`;
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
