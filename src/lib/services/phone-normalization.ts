/**
 * International phone normalization — pure helpers, no imports (2026-11-02).
 *
 * Problem: profile phone/WhatsApp were free-text inputs with no country
 * handling, and target forms (e.g. m.b2bgdc.com's "WhatsApp Number") need
 * a real number. A WhatsApp field left empty makes the mapper emit ''
 * for a required field, which the orchestrator turns into REVIEW
 * ("Required Fields Missing") — that is why m.b2bgdc never sent.
 *
 * This normalizer accepts every format users actually paste and returns
 * E.164 (+<country><number>), the format WhatsApp and phone-validating
 * forms accept worldwide:
 *  - local with trunk:  01725592014 (+ dial 880) -> +8801725592014
 *  - international:     +8801725592014 -> +8801725592014 (any dial)
 *  - wa.me links:       wa.me/+8801725592014, wa.me/8801725592014,
 *                       https://wa.me/8801725592014?text=hi -> +8801725592014
 *  - 00 prefix:         008801725592014 -> +8801725592014
 *  - spaces/dashes/parens/dots are stripped.
 * Empty input returns '' (the fields are optional). Anything else that
 * cannot become a valid E.164 number returns null (callers reject it
 * instead of saving garbage).
 */

export const COUNTRY_DIAL_CODES = [
  { code: 'BD', dial: '880', label: 'Bangladesh (+880)' },
  { code: 'GB', dial: '44', label: 'United Kingdom (+44)' },
  { code: 'US', dial: '1', label: 'United States (+1)' },
  { code: 'CA', dial: '1', label: 'Canada (+1)' },
  { code: 'IN', dial: '91', label: 'India (+91)' },
  { code: 'PK', dial: '92', label: 'Pakistan (+92)' },
  { code: 'AE', dial: '971', label: 'UAE (+971)' },
  { code: 'SA', dial: '966', label: 'Saudi Arabia (+966)' },
  { code: 'QA', dial: '974', label: 'Qatar (+974)' },
  { code: 'KW', dial: '965', label: 'Kuwait (+965)' },
  { code: 'OM', dial: '968', label: 'Oman (+968)' },
  { code: 'BH', dial: '973', label: 'Bahrain (+973)' },
  { code: 'MY', dial: '60', label: 'Malaysia (+60)' },
  { code: 'SG', dial: '65', label: 'Singapore (+65)' },
  { code: 'AU', dial: '61', label: 'Australia (+61)' },
  { code: 'DE', dial: '49', label: 'Germany (+49)' },
  { code: 'FR', dial: '33', label: 'France (+33)' },
  { code: 'NP', dial: '977', label: 'Nepal (+977)' },
  { code: 'LK', dial: '94', label: 'Sri Lanka (+94)' },
  { code: 'AF', dial: '93', label: 'Afghanistan (+93)' },
];

function validE164Digits(digits: string): boolean {
  return /^\d{7,15}$/.test(digits) && !digits.startsWith('0');
}

export function normalizePhoneNumber(raw: string, dialCode: string): string | null {
  const input = (raw || '').trim();
  if (!input) return '';
  // Strip wa.me / WhatsApp share links (with or without scheme, query).
  let s = input
    .replace(/^https?:\/\/(www\.)?wa\.me\//i, '')
    .replace(/^https?:\/\/(www\.)?api\.whatsapp\.com\/send\?phone=/i, '')
    .replace(/^wa\.me\//i, '')
    .replace(/^api\.whatsapp\.com\/send\?phone=/i, '');
  s = s.split('?')[0].split('#')[0];
  s = s.replace(/[\s\-().]/g, '');
  if (!s) return null;

  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    return validE164Digits(digits) ? `+${digits}` : null;
  }
  if (s.startsWith('00')) {
    const digits = s.slice(2).replace(/\D/g, '');
    return validE164Digits(digits) ? `+${digits}` : null;
  }
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  const dial = (dialCode || '').replace(/\D/g, '');
  if (dial && digits.startsWith(dial)) {
    return validE164Digits(digits) ? `+${digits}` : null;
  }
  if (digits.startsWith('0')) {
    if (!dial) return null;
    const national = digits.slice(1);
    return validE164Digits(dial + national) ? `+${dial}${national}` : null;
  }
  // Long digit strings without a trunk 0 are already international
  // (e.g. 8801725592014 pasted without +) — do not double-prefix.
  if (digits.length > 10) {
    return validE164Digits(digits) ? `+${digits}` : null;
  }
  if (!dial) return null;
  return validE164Digits(dial + digits) ? `+${dial}${digits}` : null;
}

/** Longest matching dial code for a stored E.164 value (for the UI select). */
export function inferDialCode(e164: string): string {
  const digits = (e164 || '').trim().replace(/^\+/, '').replace(/\D/g, '');
  if (!digits) return '';
  let best = '';
  for (const entry of COUNTRY_DIAL_CODES) {
    if (digits.startsWith(entry.dial) && entry.dial.length > best.length) best = entry.dial;
  }
  return best;
}
