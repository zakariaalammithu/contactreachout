/**
 * Sender contact identity persistence (2026-11-02, profile phone batch).
 * Server-only.
 *
 * Problem: profile phone/WhatsApp lived ONLY in AuthStore (per-serverless-
 * instance memory). A save on one instance was invisible to the campaign
 * process route on another instance — so the mapper's
 * user_contact_identity fallback stayed empty and required-phone forms
 * (m.b2bgdc.com) kept landing in REVIEW even after the user "saved" a
 * number. The durable home is public.app_users (migration
 * 20261102000004 adds phone/whatsapp columns; until it is applied every
 * function here degrades to AuthStore-only and reports durable=false,
 * never throwing).
 *
 * Precedence everywhere: AuthStore value if non-empty (freshest on this
 * instance), else the durable row. Values are normalized to E.164 at
 * save time; legacy raw values are passed through unchanged rather than
 * dropped when they cannot be normalized.
 */

import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { normalizePhoneNumber } from './phone-normalization';

export type DurableContact = {
  found: boolean;
  phone: string;
  whatsapp: string;
};

/** Read the durable row. Null = table/columns unavailable (not an error). */
export async function readDurableContact(email: string): Promise<DurableContact | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('app_users')
      .select('phone, whatsapp')
      .eq('email_normalized', email.toLowerCase().trim())
      .maybeSingle();
    if (error) return null;
    if (!data) return { found: false, phone: '', whatsapp: '' };
    return { found: true, phone: (data as any).phone || '', whatsapp: (data as any).whatsapp || '' };
  } catch {
    return null;
  }
}

/** Best-effort durable write. False = unavailable (caller still has AuthStore). */
export async function writeDurableContact(
  userId: string,
  email: string,
  phone: string,
  whatsapp: string,
): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) return false;
  try {
    const { error } = await client.from('app_users').upsert(
      {
        legacy_authstore_user_id: userId,
        email_normalized: email.toLowerCase().trim(),
        phone,
        whatsapp,
      },
      { onConflict: 'email_normalized' },
    );
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the sender phone/WhatsApp for a campaign run: AuthStore first,
 * durable row second. Normalizes E.164-cleanable values; unparseable
 * legacy values pass through raw (better to attempt the fill than to
 * silently empty a field the user did save).
 */
export async function resolveSenderContact(
  email: string,
  authUser: { phone?: string | null; whatsApp?: string | null } | null,
): Promise<{ phone: string; whatsapp: string }> {
  let phone = (authUser?.phone || '').trim();
  let whatsapp = (authUser?.whatsApp || '').trim();
  if (!phone || !whatsapp) {
    const durable = await readDurableContact(email);
    if (durable) {
      if (!phone) phone = durable.phone;
      if (!whatsapp) whatsapp = durable.whatsapp;
    }
  }
  const normalizedPhone = phone ? normalizePhoneNumber(phone, '') : '';
  const normalizedWhatsapp = whatsapp ? normalizePhoneNumber(whatsapp, '') : '';
  return {
    phone: normalizedPhone === null ? phone : normalizedPhone || '',
    whatsapp: normalizedWhatsapp === null ? whatsapp : normalizedWhatsapp || '',
  };
}
