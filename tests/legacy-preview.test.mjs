import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
const admin = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('server-only', () => ({})); vi.mock('@/lib/supabase/admin-client', () => ({ getSupabaseAdminClient: admin.get }));
vi.mock('@/lib/persistence/campaign-repository', () => ({ createCampaign: vi.fn() })); vi.mock('@/lib/persistence/lead-list-repository', () => ({ createLeadList: vi.fn() })); vi.mock('@/lib/persistence/lead-repository', () => ({ createLead: vi.fn(), assignLeadToCampaign: vi.fn() }));
const { createImportPreview, approveAndImport } = await import('@/lib/persistence/legacy-import-service');
const context = { appUserId: 'user-a', organizationId: 'org-a', emailNormalized: 'owner@example.test', role: 'OWNER' };
describe('legacy import audit safety', () => {
  beforeEach(() => admin.get.mockReset());
  it('writes only preview audit records and quarantines conflicting ownership', async () => {
    const tables = []; admin.get.mockReturnValue({ from: vi.fn(table => { tables.push(table); if (table === 'app_legacy_import_batches') return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'batch-a', status: 'PREVIEWED', preview_summary: {} }, error: null }) }) }) }; if (table === 'app_legacy_import_items') return { insert: async () => ({ error: null }) }; throw new Error(`business write: ${table}`); }) });
    const result = await createImportPreview(context, { campaigns: [{ id: 'c', ownerEmail: 'other@example.test', prospectsList: [{ id: 'p' }] }], leads: [], leadLists: [] });
    expect(tables).toEqual(['app_legacy_import_batches', 'app_legacy_import_items']); expect(result.summary.nestedQuarantined).toBe(1);
  });
  it('returns an already completed batch without re-importing records', async () => {
    const payload = { campaigns: [], leads: [], leadLists: [] }; const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    admin.get.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status: 'COMPLETED', preview_summary: { payloadHash } }, error: null }) }) }) }) }) }) });
    await expect(approveAndImport(context, 'batch-a', payload)).resolves.toEqual({ status: 'COMPLETED', idempotent: true });
  });
});
