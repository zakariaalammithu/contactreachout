import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_DRAFT_STORAGE_KEY,
  DELETED_CAMPAIGN_IDS_STORAGE_KEY,
  formatStoragePressureMessage,
  persistCampaignDraft,
  readCampaignDrafts,
  removeCampaignDrafts,
  writeCampaignDrafts,
} from '../src/lib/services/campaign-draft-storage';

class MemoryStorage {
  constructor(seed = {}, byteLimit = Number.POSITIVE_INFINITY) {
    this.values = new Map(Object.entries(seed));
    this.byteLimit = byteLimit;
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  removeItem(key) { this.values.delete(key); }
  setItem(key, value) {
    const next = new Map(this.values);
    next.set(key, value);
    const bytes = [...next].reduce((sum, [entryKey, entryValue]) => sum + (entryKey.length + entryValue.length) * 2, 0);
    if (bytes > this.byteLimit) {
      const error = new Error('quota');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.values = next;
  }
}

describe('campaign browser persistence', () => {
  it('persists deletion before updating tombstones so a deleted campaign stays deleted after reload', () => {
    const campaigns = [{ id: 'keep', body: 'x'.repeat(100) }, { id: 'delete', body: 'x'.repeat(100) }];
    const seed = {
      [CAMPAIGN_DRAFT_STORAGE_KEY]: JSON.stringify(campaigns),
      [DELETED_CAMPAIGN_IDS_STORAGE_KEY]: JSON.stringify([]),
    };
    const initialBytes = Object.entries(seed).reduce((sum, [key, value]) => sum + (key.length + value.length) * 2, 0);
    const storage = new MemoryStorage(seed, initialBytes);

    removeCampaignDrafts(storage, ['delete']);

    expect(readCampaignDrafts(storage).map((campaign) => campaign.id)).toEqual(['keep']);
    expect(JSON.parse(storage.getItem(DELETED_CAMPAIGN_IDS_STORAGE_KEY))).toEqual(['delete']);
  });

  it('does not restore a deleted campaign when another page writes a stale campaign snapshot', () => {
    const staleSnapshot = [{ id: 'keep' }, { id: 'delete' }];
    const storage = new MemoryStorage({
      [CAMPAIGN_DRAFT_STORAGE_KEY]: JSON.stringify(staleSnapshot),
      [DELETED_CAMPAIGN_IDS_STORAGE_KEY]: JSON.stringify([]),
    });

    removeCampaignDrafts(storage, ['delete']);
    storage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, JSON.stringify(staleSnapshot));

    expect(readCampaignDrafts(storage).map((campaign) => campaign.id)).toEqual(['keep']);
  });

  it('physically excludes deleted campaigns when a stale component saves its snapshot', () => {
    const storage = new MemoryStorage({
      [CAMPAIGN_DRAFT_STORAGE_KEY]: JSON.stringify([{ id: 'keep' }]),
      [DELETED_CAMPAIGN_IDS_STORAGE_KEY]: JSON.stringify(['delete']),
    });

    writeCampaignDrafts(storage, [{ id: 'keep' }, { id: 'delete' }]);

    expect(JSON.parse(storage.getItem(CAMPAIGN_DRAFT_STORAGE_KEY)).map((campaign) => campaign.id)).toEqual(['keep']);
  });

  it('restores the original campaign collection when the deletion marker cannot be saved', () => {
    const original = JSON.stringify([{ id: 'keep' }, { id: 'delete' }]);
    const storage = new MemoryStorage({ [CAMPAIGN_DRAFT_STORAGE_KEY]: original });
    const baseSetItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === DELETED_CAMPAIGN_IDS_STORAGE_KEY) {
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      }
      baseSetItem(key, value);
    };

    expect(() => removeCampaignDrafts(storage, ['delete'])).toThrowError(expect.objectContaining({ name: 'QuotaExceededError' }));
    expect(storage.getItem(CAMPAIGN_DRAFT_STORAGE_KEY)).toBe(original);
    expect(readCampaignDrafts(storage).map((campaign) => campaign.id)).toEqual(['keep', 'delete']);
  });

  it('does not report a new draft as persisted when a quota write fails', () => {
    const seed = { [CAMPAIGN_DRAFT_STORAGE_KEY]: JSON.stringify([{ id: 'existing' }]) };
    const initialBytes = Object.entries(seed).reduce((sum, [key, value]) => sum + (key.length + value.length) * 2, 0);
    const storage = new MemoryStorage(seed, initialBytes);

    expect(() => persistCampaignDraft(storage, { id: 'new' })).toThrowError(expect.objectContaining({ name: 'QuotaExceededError' }));
    expect(readCampaignDrafts(storage).map((campaign) => campaign.id)).toEqual(['existing']);
  });

  it('reports storage pressure by key and size without including stored content', () => {
    const storage = new MemoryStorage({ user_campaigns: JSON.stringify([{ secretMessage: 'private campaign copy' }]), user_imported_leads: '[]' });
    const message = formatStoragePressureMessage(storage);

    expect(message).toContain('user_campaigns');
    expect(message).toContain('user_imported_leads');
    expect(message).not.toContain('private campaign copy');
  });
});
