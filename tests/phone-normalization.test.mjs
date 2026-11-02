import { describe, expect, it } from 'vitest';
import { inferDialCode, normalizePhoneNumber } from '@/lib/services/phone-normalization';

describe('phone normalization (E.164)', () => {
  it('converts a Bangladeshi local number with the selected country', () => {
    expect(normalizePhoneNumber('01725592014', '880')).toBe('+8801725592014');
    expect(normalizePhoneNumber('01725 592014', '880')).toBe('+8801725592014');
    expect(normalizePhoneNumber('01725-592-014', '880')).toBe('+8801725592014');
  });

  it('keeps an explicit international number as-is, whatever the country', () => {
    expect(normalizePhoneNumber('+8801725592014', '44')).toBe('+8801725592014');
    expect(normalizePhoneNumber('+44 7000 000000', '880')).toBe('+447000000000');
    expect(normalizePhoneNumber('008801725592014', '44')).toBe('+8801725592014');
  });

  it('converts wa.me links to the number (links are not numbers)', () => {
    expect(normalizePhoneNumber('wa.me/+8801725592014', '880')).toBe('+8801725592014');
    expect(normalizePhoneNumber('wa.me/8801725592014', '880')).toBe('+8801725592014');
    expect(normalizePhoneNumber('https://wa.me/8801725592014?text=hi', '44')).toBe('+8801725592014');
    expect(normalizePhoneNumber('https://wa.me/+8801725592014', '44')).toBe('+8801725592014');
  });

  it('handles other countries with trunk and national formats', () => {
    expect(normalizePhoneNumber('07700 900000', '44')).toBe('+447700900000');
    expect(normalizePhoneNumber('(555) 234-5678', '1')).toBe('+15552345678');
    expect(normalizePhoneNumber('9876543210', '91')).toBe('+919876543210');
  });

  it('does not double-prefix a bare international number', () => {
    expect(normalizePhoneNumber('8801725592014', '44')).toBe('+8801725592014');
  });

  it('accepts empty (optional fields) and rejects garbage', () => {
    expect(normalizePhoneNumber('', '880')).toBe('');
    expect(normalizePhoneNumber('   ', '880')).toBe('');
    expect(normalizePhoneNumber('abc', '880')).toBe(null);
    expect(normalizePhoneNumber('123', '880')).toBe(null);
    expect(normalizePhoneNumber('+', '880')).toBe(null);
    expect(normalizePhoneNumber('017', '880')).toBe(null);
  });

  it('infers the dial code from a stored E.164 value', () => {
    expect(inferDialCode('+8801725592014')).toBe('880');
    expect(inferDialCode('+447700900000')).toBe('44');
    expect(inferDialCode('+15552345678')).toBe('1');
    expect(inferDialCode('')).toBe('');
  });
});
