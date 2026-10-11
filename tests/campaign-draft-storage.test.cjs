const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/services/campaign-draft-storage.ts', 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleUnderTest = { exports: {} };
new Function('require', 'module', 'exports', output)(require, moduleUnderTest, moduleUnderTest.exports);

const { CAMPAIGN_DRAFT_STORAGE_KEY, createUniqueCampaignId, persistCampaignDraft, readCampaignDrafts } = moduleUnderTest.exports;

class MemoryStorage {
  constructor(seed = null) { this.value = seed; }
  getItem(key) { return key === CAMPAIGN_DRAFT_STORAGE_KEY ? this.value : null; }
  setItem(key, value) { if (key === CAMPAIGN_DRAFT_STORAGE_KEY) this.value = value; }
}

const storage = new MemoryStorage(JSON.stringify([{ id: 'camp-100', name: 'Existing' }]));
assert.equal(createUniqueCampaignId(readCampaignDrafts(storage), 100), 'camp-100-1');
persistCampaignDraft(storage, { id: 'camp-101', name: 'Draft' });
assert.deepEqual(readCampaignDrafts(storage).map((campaign) => campaign.id), ['camp-101', 'camp-100']);
assert.throws(() => persistCampaignDraft(storage, { id: 'camp-101' }), /already exists/);
assert.throws(() => readCampaignDrafts(new MemoryStorage('{broken')), /corrupted/);
assert.throws(() => readCampaignDrafts(new MemoryStorage(JSON.stringify({ campaigns: [] }))), /invalid format/);

const rejectingStorage = new MemoryStorage();
rejectingStorage.setItem = () => { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; };
assert.throws(() => persistCampaignDraft(rejectingStorage, { id: 'camp-102' }), (error) => error.name === 'QuotaExceededError');

console.log('PASS: campaign draft storage persistence regression tests');
