import { normalizePhoneNumber } from './phone-normalization';

/**
 * Sender-identity completeness gate for LIVE campaign starts (pure).
 *
 * A live campaign must not start without a complete sender identity —
 * otherwise required form fields (name / phone / WhatsApp) cannot be
 * filled and leads fall to REVIEW one by one. This check runs in
 * validate-start, before any lead is processed, so the failure is
 * fail-fast with an exact missing list instead of a silent per-lead
 * trickle.
 *
 * Validity, not just presence: a stored phone/WhatsApp value must
 * normalize to E.164 (normalizePhoneNumber with no dial context only
 * accepts values that are already international). Garbage or short
 * local numbers count as missing so the user re-saves them properly.
 * Dry runs are exempt (they send nothing) — the route enforces that.
 */
export type IdentityField = 'fullName' | 'phone' | 'whatsApp';

export const IDENTITY_FIELD_LABELS: Record<IdentityField, string> = {
  fullName: 'Full name',
  phone: 'Phone number',
  whatsApp: 'WhatsApp number',
};

function isValidStoredNumber(value: string | null | undefined): boolean {
  if (!value || !value.trim()) return false;
  const normalized = normalizePhoneNumber(value, '');
  return normalized !== null && normalized !== '';
}

export function checkSenderIdentity(input: {
  fullName?: string | null;
  phone?: string | null;
  whatsApp?: string | null;
}): { complete: boolean; missing: IdentityField[] } {
  const missing: IdentityField[] = [];
  if (!input.fullName || !input.fullName.trim()) missing.push('fullName');
  if (!isValidStoredNumber(input.phone)) missing.push('phone');
  if (!isValidStoredNumber(input.whatsApp)) missing.push('whatsApp');
  return { complete: missing.length === 0, missing };
}

export function formatMissingIdentity(missing: IdentityField[]): string {
  return missing.map((field) => IDENTITY_FIELD_LABELS[field]).join(', ');
}
