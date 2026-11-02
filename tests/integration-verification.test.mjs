import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Created here (not only inside the factory) because the factory runs
// lazily on first import, which happens after beforeEach.
globalThis.__testAdminSettings = { available: true, value: null };

// Controllable fake for the durable store. Tests mutate its properties
// (never replace the object) so the mock factory's captured reference
// stays live across module resets.
vi.mock('@/lib/services/admin-settings-service', () => {
  const store = globalThis.__testAdminSettings;
  return {
    getAdminSetting: async () => ({
      available: store.available,
      value: store.value,
      error: store.available ? undefined : 'admin_settings table is missing.',
    }),
    setAdminSetting: async (_key, value) => {
      if (!store.available) return { ok: false, error: 'admin_settings table is missing.' };
      store.value = value;
      return { ok: true };
    },
  };
});

async function freshService() {
  vi.resetModules();
  return import('@/lib/services/integration-verification-service');
}

beforeEach(() => {
  globalThis.__testAdminSettings.available = true;
  globalThis.__testAdminSettings.value = null;
});

describe('integration last-verified times', () => {
  it('records and reads back a durable entry', async () => {
    const svc = await freshService();
    const written = await svc.recordVerification('stripe', true);
    expect(written).toEqual({ recorded: true, durable: true });

    const got = await svc.getLastVerified();
    expect(got.durable).toBe(true);
    expect(got.records.stripe.ok).toBe(true);
    expect(Number.isNaN(Date.parse(got.records.stripe.at))).toBe(false);
  });

  it('falls back to memory when the table is missing', async () => {
    globalThis.__testAdminSettings.available = false;
    const svc = await freshService();
    const written = await svc.recordVerification('resend', false);
    expect(written).toEqual({ recorded: true, durable: false });

    const got = await svc.getLastVerified();
    expect(got.durable).toBe(false);
    expect(got.records.resend.ok).toBe(false);
  });

  it('ignores malformed durable entries instead of crashing', async () => {
    globalThis.__testAdminSettings.value = {
      stripe: { at: 'not-a-date', ok: true },
      ai: { at: new Date().toISOString(), ok: 'yes' },
      sheets: { at: new Date().toISOString(), ok: true },
    };
    const svc = await freshService();
    const got = await svc.getLastVerified();
    expect(got.durable).toBe(true);
    expect(got.records).toEqual({});
  });

  it('rejects unknown integrations and keeps the latest result', async () => {
    const svc = await freshService();
    expect(await svc.recordVerification('sheets', true)).toEqual({
      recorded: false,
      durable: false,
    });
    await svc.recordVerification('ai', false);
    await svc.recordVerification('ai', true);
    const got = await svc.getLastVerified();
    expect(got.records.sheets).toBeUndefined();
    expect(got.records.ai.ok).toBe(true);
  });
});
