import 'server-only';

import { getAdminSetting, setAdminSetting } from '@/lib/services/admin-settings-service';

/**
 * Last-verified times for integrations that have a dashboard test
 * action (Stripe, Resend, AI). Google Sheets has no test action and
 * Supabase/Redis are status-only cards, so they intentionally have no
 * record — the hub shows "No test available" for them instead of a
 * fabricated date.
 *
 * Durable store: admin_settings key `integrations.lastVerified`
 * (migration 20261102000005). Until that table exists, records live
 * in module memory (per serverless instance) and callers must report
 * durable:false honestly — test times reset on redeploy.
 */
export const VERIFIABLE_INTEGRATIONS = ['stripe', 'resend', 'ai'] as const;
export type VerifiableIntegration = (typeof VERIFIABLE_INTEGRATIONS)[number];

export interface VerificationRecord {
  /** ISO timestamp of the most recent test run. */
  at: string;
  /** Whether that run passed. */
  ok: boolean;
}

const SETTINGS_KEY = 'integrations.lastVerified';

const memoryRecords = new Map<string, VerificationRecord>();

function isVerifiable(value: string): value is VerifiableIntegration {
  return (VERIFIABLE_INTEGRATIONS as readonly string[]).includes(value);
}

function parseRecords(raw: unknown): Map<string, VerificationRecord> {
  const out = new Map<string, VerificationRecord>();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!isVerifiable(key) || !entry || typeof entry !== 'object') continue;
    const { at, ok } = entry as { at?: unknown; ok?: unknown };
    if (typeof at !== 'string' || Number.isNaN(Date.parse(at)) || typeof ok !== 'boolean') continue;
    out.set(key, { at, ok });
  }
  return out;
}

function toPlain(records: Map<string, VerificationRecord>): Record<string, VerificationRecord> {
  return Object.fromEntries(records.entries());
}

export async function getLastVerified(): Promise<{
  records: Record<string, VerificationRecord>;
  durable: boolean;
}> {
  const read = await getAdminSetting<Record<string, VerificationRecord>>(SETTINGS_KEY);
  if (read.available) {
    return { records: toPlain(parseRecords(read.value)), durable: true };
  }
  return { records: toPlain(memoryRecords), durable: false };
}

export async function recordVerification(
  integration: string,
  ok: boolean,
): Promise<{ recorded: boolean; durable: boolean }> {
  if (!isVerifiable(integration)) return { recorded: false, durable: false };
  const entry: VerificationRecord = { at: new Date().toISOString(), ok };
  memoryRecords.set(integration, entry);

  const read = await getAdminSetting<Record<string, VerificationRecord>>(SETTINGS_KEY);
  if (!read.available) return { recorded: true, durable: false };
  const merged = parseRecords(read.value);
  merged.set(integration, entry);
  const written = await setAdminSetting(SETTINGS_KEY, toPlain(merged));
  return { recorded: true, durable: written.ok };
}
