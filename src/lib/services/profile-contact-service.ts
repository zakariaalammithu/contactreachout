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
 * 20261108000001 adds phone/whatsapp/reply_email columns; migration
 * 20261111000001 adds company_name/website/job_title/country; migration
 * 20261113000001 adds street_address/city/state_region/postal_code;
 * until a migration is applied every function here degrades gracefully
 * and reports durable=false for saves that need it, never throwing).
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
  companyName: string;
  website: string;
  jobTitle: string;
  country: string;
  streetAddress: string;
  city: string;
  stateRegion: string;
  postalCode: string;
};

/** Read the durable row. Null = table/columns unavailable (not an error). */
export async function readDurableContact(email: string): Promise<DurableContact | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  const key = email.toLowerCase().trim();
  const empty: DurableContact = { found: false, displayName: '', phone: '', whatsapp: '', replyEmail: '', companyName: '', website: '', jobTitle: '', country: '', streetAddress: '', city: '', stateRegion: '', postalCode: '' };
  const toContact = (data: any, withCompany: boolean, withAddress: boolean): DurableContact => ({
    found: true,
    displayName: (data as any).display_name || '',
    phone: (data as any).phone || '',
    whatsapp: (data as any).whatsapp || '',
    replyEmail: (data as any).reply_email || '',
    companyName: withCompany ? (data as any).company_name || '' : '',
    website: withCompany ? (data as any).website || '' : '',
    jobTitle: withCompany ? (data as any).job_title || '' : '',
    country: withCompany ? (data as any).country || '' : '',
    streetAddress: withAddress ? (data as any).street_address || '' : '',
    city: withAddress ? (data as any).city || '' : '',
    stateRegion: withAddress ? (data as any).state_region || '' : '',
    postalCode: withAddress ? (data as any).postal_code || '' : '',
  });
  try {
    const { data, error } = await client
      .from('app_users')
      .select('display_name, phone, whatsapp, reply_email, company_name, website, job_title, country, street_address, city, state_region, postal_code')
      .eq('email_normalized', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return empty;
    return toContact(data, true, true);
  } catch {
    // A migration is not applied yet, so the full select fails on the
    // missing columns. Retry with the sender-company columns (migration
    // 20261111000001) so those keep working exactly as before, then with
    // the pre-existing columns so phone/WhatsApp durability never
    // regresses. Each tier returns its own fields as ''.
    try {
      const { data, error } = await client
        .from('app_users')
        .select('display_name, phone, whatsapp, reply_email, company_name, website, job_title, country')
        .eq('email_normalized', key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return empty;
      return toContact(data, true, false);
    } catch {
      try {
        const { data, error } = await client
          .from('app_users')
          .select('display_name, phone, whatsapp, reply_email')
          .eq('email_normalized', key)
          .maybeSingle();
        if (error) return null;
        if (!data) return empty;
        return toContact(data, false, false);
      } catch {
        return null;
      }
    }
  }
}

export type DurableContactWrite = {
  displayName?: string;
  phone?: string;
  whatsapp?: string;
  replyEmail?: string;
  companyName?: string;
  website?: string;
  jobTitle?: string;
  country?: string;
  streetAddress?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
};

/**
 * Best-effort durable write. False = unavailable (caller still has
 * AuthStore). Only the fields present in `values` are written, so a
 * profile save never wipes a reply email stored by the verified
 * reply-email flow, and vice versa. Until migration
 * 20261108000001_app_users_identity.sql is applied, the upsert fails
 * (missing columns) and this returns false — the caller reports
 * contactDurable=false instead of pretending the save stuck.
 *
 * When companyName/website/jobTitle/country are part of the write and
 * their migration (20261111000001) is not applied yet, the full upsert
 * fails on the missing columns: the write is retried WITHOUT them so the
 * pre-existing fields still land durably, but false is still returned —
 * the new fields did not stick, and the caller must say so. The address
 * columns (migration 20261113000001) are a second, independent tier:
 * when only they are missing, the retry drops just the address columns
 * and keeps the company columns; when both migrations are missing, a
 * further retry drops the company columns too.
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
    const hasCompanyColumns = values.companyName !== undefined || values.website !== undefined
      || values.jobTitle !== undefined || values.country !== undefined;
    if (values.companyName !== undefined) row.company_name = values.companyName;
    if (values.website !== undefined) row.website = values.website;
    if (values.jobTitle !== undefined) row.job_title = values.jobTitle;
    if (values.country !== undefined) row.country = values.country;
    const hasAddressColumns = values.streetAddress !== undefined || values.city !== undefined
      || values.stateRegion !== undefined || values.postalCode !== undefined;
    if (values.streetAddress !== undefined) row.street_address = values.streetAddress;
    if (values.city !== undefined) row.city = values.city;
    if (values.stateRegion !== undefined) row.state_region = values.stateRegion;
    if (values.postalCode !== undefined) row.postal_code = values.postalCode;
    const { error } = await client.from('app_users').upsert(row, { onConflict: 'email_normalized' });
    if (!error) return true;
    if (!hasCompanyColumns && !hasAddressColumns) return false;
    // Retry without the address columns first (keeps the company
    // columns when only the address migration is missing); each retry
    // that succeeds still returns false — the dropped fields did not
    // stick, and the caller must say so.
    let current = row;
    if (hasAddressColumns) {
      const withoutAddress: Record<string, unknown> = { ...row };
      delete withoutAddress.street_address;
      delete withoutAddress.city;
      delete withoutAddress.state_region;
      delete withoutAddress.postal_code;
      const addressRetry = await client.from('app_users').upsert(withoutAddress, { onConflict: 'email_normalized' });
      if (!addressRetry.error) return false;
      current = withoutAddress;
    }
    if (!hasCompanyColumns) return false;
    const legacyRow: Record<string, unknown> = { ...current };
    delete legacyRow.company_name;
    delete legacyRow.website;
    delete legacyRow.job_title;
    delete legacyRow.country;
    await client.from('app_users').upsert(legacyRow, { onConflict: 'email_normalized' });
    return false;
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
 * Company and website come from the same two layers (AuthStore user
 * record first, durable row second); they have no other home. So do job
 * title and country.
 */
export async function resolveAccountIdentity(
  email: string,
  authUser: { name?: string | null; email?: string | null; replyEmail?: string | null; phone?: string | null; whatsApp?: string | null; company?: string | null; website?: string | null; jobTitle?: string | null; country?: string | null; streetAddress?: string | null; city?: string | null; stateRegion?: string | null; postalCode?: string | null } | null,
): Promise<{ fullName: string; replyEmail: string; phone: string; whatsApp: string; companyName: string; website: string; jobTitle: string; country: string; streetAddress: string; city: string; stateRegion: string; postalCode: string }> {
  const senderContact = await resolveSenderContact(email, authUser);
  const durable = await readDurableContact(email);
  const loginEmail = (authUser?.email || email || '').trim();
  return {
    fullName: (authUser?.name || '').trim() || (durable?.displayName || '').trim(),
    replyEmail: (authUser?.replyEmail || '').trim() || (durable?.replyEmail || '').trim() || loginEmail,
    phone: senderContact.phone,
    whatsApp: senderContact.whatsapp,
    companyName: (authUser?.company || '').trim() || (durable?.companyName || '').trim(),
    website: (authUser?.website || '').trim() || (durable?.website || '').trim(),
    jobTitle: (authUser?.jobTitle || '').trim() || (durable?.jobTitle || '').trim(),
    country: (authUser?.country || '').trim() || (durable?.country || '').trim(),
    streetAddress: (authUser?.streetAddress || '').trim() || (durable?.streetAddress || '').trim(),
    city: (authUser?.city || '').trim() || (durable?.city || '').trim(),
    stateRegion: (authUser?.stateRegion || '').trim() || (durable?.stateRegion || '').trim(),
    postalCode: (authUser?.postalCode || '').trim() || (durable?.postalCode || '').trim(),
  };
}
