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
 * 20261108000001 adds phone/whatsapp/reply_email columns; until it is
 * applied every function here degrades to AuthStore-only and reports
 * durable=false, never throwing).
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
  displayName: string;
  phone: string;
  whatsapp: string;
  replyEmail: string;
};

/** Read the durable row. Null = table/columns unavailable (not an error). */
export async function readDurableContact(email: string): Promise<DurableContact | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('app_users')
      .select('display_name, phone, whatsapp, reply_email')
      .eq('email_normalized', email.toLowerCase().trim())
      .maybeSingle();
    if (error) return null;
    if (!data) return { found: false, displayName: '', phone: '', whatsapp: '', replyEmail: '' };
    return {
      found: true,
      displayName: (data as any).display_name || '',
      phone: (data as any).phone || '',
      whatsapp: (data as any).whatsapp || '',
      replyEmail: (data as any).reply_email || '',
    };
  } catch {
    return null;
  }
}

export type DurableContactWrite = {
  displayName?: string;
  phone?: string;
  whatsapp?: string;
  replyEmail?: string;
};

/**
 * Best-effort durable write. False = unavailable (caller still has
 * AuthStore). Only the fields present in `values` are written, so a
 * profile save never wipes a reply email stored by the verified
 * reply-email flow, and vice versa. Until migration
 * 20261108000001_app_users_identity.sql is applied, the upsert fails
 * (missing columns) and this returns false — the caller reports
 * contactDurable=false instead of pretending the save stuck.
 */
export async function writeDurableContact(
  userId: string,
  email: string,
  values: DurableContactWrite,
): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) return false;
  try {
    const row: Record<string, unknown> = {
      legacy_authstore_user_id: userId,
      email_normalized: email.toLowerCase().trim(),
    };
    if (values.displayName !== undefined) row.display_name = values.displayName;
    if (values.phone !== undefined) row.phone = values.phone;
    if (values.whatsapp !== undefined) row.whatsapp = values.whatsapp;
    if (values.replyEmail !== undefined) row.reply_email = values.replyEmail;
    const { error } = await client.from('app_users').upsert(row, { onConflict: 'email_normalized' });
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

/**
 * Resolve the account-level sender identity for a send: AuthStore first
 * (freshest on this instance), durable app_users row second. The reply
 * email falls back to the login email, matching the account's verified
 * default; the name has no fallback beyond the durable display name.
 * Callers layer a campaign override on top with
 * resolveCampaignSenderIdentity.
 */
export async function resolveAccountIdentity(
  email: string,
  authUser: { name?: string | null; email?: string | null; replyEmail?: string | null; phone?: string | null; whatsApp?: string | null } | null,
): Promise<{ fullName: string; replyEmail: string; phone: string; whatsApp: string }> {
  const senderContact = await resolveSenderContact(email, authUser);
  const durable = await readDurableContact(email);
  const loginEmail = (authUser?.email || email || '').trim();
  return {
    fullName: (authUser?.name || '').trim() || (durable?.displayName || '').trim(),
    replyEmail: (authUser?.replyEmail || '').trim() || (durable?.replyEmail || '').trim() || loginEmail,
    phone: senderContact.phone,
    whatsApp: senderContact.whatsapp,
  };
}
