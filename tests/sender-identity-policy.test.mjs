import { describe, expect, it } from 'vitest';

import { checkSenderIdentity, formatMissingIdentity } from '@/lib/services/sender-identity-policy';

describe('sender identity gate', () => {
  it('passes a complete identity', () => {
    expect(
      checkSenderIdentity({
        fullName: 'Alex Morgan',
        phone: '+8801725592014',
        whatsApp: '+8801725592014',
      }),
    ).toEqual({ complete: true, missing: [] });
  });

  it('lists every missing field', () => {
    expect(checkSenderIdentity({})).toEqual({
      complete: false,
      missing: ['fullName', 'phone', 'whatsApp'],
    });
    expect(formatMissingIdentity(['fullName', 'phone', 'whatsApp'])).toBe(
      'Full name, Phone number, WhatsApp number',
    );
  });

  it('treats blank names and unparseable numbers as missing', () => {
    expect(
      checkSenderIdentity({ fullName: '   ', phone: 'abc', whatsApp: '0172' }),
    ).toEqual({
      complete: false,
      missing: ['fullName', 'phone', 'whatsApp'],
    });
  });

  it('accepts international numbers without a plus sign', () => {
    // A long digit string is already international per the normalizer.
    expect(
      checkSenderIdentity({
        fullName: 'Alex Morgan',
        phone: '8801725592014',
        whatsApp: '+447700900123',
      }).complete,
    ).toBe(true);
  });
});
