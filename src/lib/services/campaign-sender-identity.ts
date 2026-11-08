import { normalizePhoneNumber } from './phone-normalization';

/**
 * Campaign-level sender identity (2026-11-08).
 *
 * Two data levels, kept separate:
 * - Account default: the user's saved contact identity (Full Name, Reply
 *   Email, Phone, WhatsApp), resolved by the server from AuthStore with
 *   the durable app_users row as fallback.
 * - Campaign identity: an optional per-campaign override stored on the
 *   campaign draft. A campaign that carries no override uses the account
 *   default; a campaign that overrides any field uses that field's
 *   campaign value, and only that field — the account default is never
 *   overwritten by a campaign edit.
 *
 * Pure helpers, no imports beyond phone normalization, so the editor,
 * the runner payload and the server routes can all share them.
 */

export type CampaignSenderIdentity = {
  fullName: string;
  replyEmail: string;
  phone: string;
  whatsApp: string;
};

export const EMPTY_CAMPAIGN_SENDER_IDENTITY: CampaignSenderIdentity = {
  fullName: '',
  replyEmail: '',
  phone: '',
  whatsApp: '',
};

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Parse an untrusted campaign identity (draft, request body). Returns null
 * when there is no override at all (missing, non-object, or all empty) so
 * callers can treat "no override" and "empty override" the same way.
 * Unknown fields are ignored; values are trimmed, never invented.
 */
export function parseCampaignSenderIdentity(value: unknown): CampaignSenderIdentity | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const pick = (key: string): string => {
    const raw = record[key];
    return typeof raw === 'string' ? raw.trim() : '';
  };
  const identity: CampaignSenderIdentity = {
    fullName: pick('fullName'),
    replyEmail: pick('replyEmail'),
    phone: pick('phone'),
    whatsApp: pick('whatsApp'),
  };
  if (!identity.fullName && !identity.replyEmail && !identity.phone && !identity.whatsApp) return null;
  return identity;
}

/** Normalize to E.164 when possible; pass an unparseable legacy value through raw. */
function normalizeOrRaw(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const normalized = normalizePhoneNumber(trimmed, '');
  if (normalized === null) return trimmed;
  return normalized;
}

/**
 * Resolve the effective sender identity for one send: per field, the
 * campaign value wins when present; otherwise the account value is used.
 * A campaign number that cannot normalize to E.164 falls back to the
 * account number instead of sending garbage to a required form field
 * (the validate-start gate still blocks a start when the effective
 * identity is incomplete). `source` reports whether any field actually
 * came from the campaign, for telemetry.
 */
export function resolveCampaignSenderIdentity(
  campaign: CampaignSenderIdentity | null | undefined,
  account: CampaignSenderIdentity,
): { identity: CampaignSenderIdentity; source: 'campaign' | 'account' } {
  const pickText = (
    campaignValue: string | undefined,
    accountValue: string,
  ): { value: string; fromCampaign: boolean } => {
    const trimmed = (campaignValue || '').trim();
    if (trimmed) return { value: trimmed, fromCampaign: true };
    return { value: (accountValue || '').trim(), fromCampaign: false };
  };
  const pickEmail = (
    campaignValue: string | undefined,
    accountValue: string,
  ): { value: string; fromCampaign: boolean } => {
    const trimmed = (campaignValue || '').trim().toLowerCase();
    if (trimmed && EMAIL_PATTERN.test(trimmed)) return { value: trimmed, fromCampaign: true };
    return { value: (accountValue || '').trim().toLowerCase(), fromCampaign: false };
  };
  const pickNumber = (
    campaignValue: string | undefined,
    accountValue: string,
  ): { value: string; fromCampaign: boolean } => {
    const trimmed = (campaignValue || '').trim();
    if (trimmed) {
      const normalized = normalizePhoneNumber(trimmed, '');
      if (normalized !== null && normalized !== '') return { value: normalized, fromCampaign: true };
    }
    return { value: normalizeOrRaw(accountValue), fromCampaign: false };
  };

  const fullName = pickText(campaign?.fullName, account.fullName);
  const replyEmail = pickEmail(campaign?.replyEmail, account.replyEmail);
  const phone = pickNumber(campaign?.phone, account.phone);
  const whatsApp = pickNumber(campaign?.whatsApp, account.whatsApp);

  const fromCampaign = fullName.fromCampaign || replyEmail.fromCampaign || phone.fromCampaign || whatsApp.fromCampaign;
  return {
    identity: {
      fullName: fullName.value,
      replyEmail: replyEmail.value,
      phone: phone.value,
      whatsApp: whatsApp.value,
    },
    source: fromCampaign ? 'campaign' : 'account',
  };
}
