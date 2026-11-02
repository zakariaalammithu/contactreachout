import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

export interface AdminSettingRead<T> {
  /** True only when the table exists and the read succeeded. */
  available: boolean;
  value: T | null;
  error?: string;
}

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'PGRST205' || code === '42P01') return true;
  const message = String((error as { message?: string } | null)?.message || '');
  return /does not exist|could not find the table|schema cache/i.test(message);
}

/**
 * Reads one durable admin setting. Never throws: when Supabase is
 * unconfigured or the admin_settings table is missing (migration
 * 20261102000005 not applied), returns available:false so callers can
 * fail closed with an honest message instead of faking a value.
 */
export async function getAdminSetting<T>(key: string): Promise<AdminSettingRead<T>> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { available: false, value: null, error: 'Supabase is not configured on this server.' };
  }
  const { data, error } = await client
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) {
      return {
        available: false,
        value: null,
        error: 'admin_settings table is missing (migration 20261102000005 not applied).',
      };
    }
    return { available: false, value: null, error: error.message };
  }
  return { available: true, value: (data?.value as T) ?? null };
}

/**
 * Writes one durable admin setting. Returns ok:false (never throws)
 * when Supabase is unconfigured or the table is missing, so routes can
 * return an honest 503 instead of claiming a save that did not persist.
 */
export async function setAdminSetting(
  key: string,
  value: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { ok: false, error: 'Supabase is not configured on this server.' };
  }
  const { error } = await client
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) {
    if (isMissingTableError(error)) {
      return {
        ok: false,
        error: 'admin_settings table is missing (migration 20261102000005 not applied). Settings were not saved.',
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
