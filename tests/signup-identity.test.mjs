import { describe, expect, it } from 'vitest';

import { AuthStore } from '@/lib/auth/auth-store';
import { normalizePhoneNumber } from '@/lib/services/phone-normalization';

// Signup collects the account sender identity (Full Name, Reply Email,
// Phone, WhatsApp) so every campaign after it already has its default
// contact details. These tests pin the plumbing: pending signup carries
// both numbers through to the created user, and the server only accepts
// valid E.164 numbers (the form normalizes with the selected country
// first; the API re-validates with no dial code to fall back on).

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

describe('signup identity plumbing', () => {
  it('pending signup carries phone and WhatsApp through to the created user', () => {
    const email = uniqueEmail('signup-identity');
    AuthStore.savePendingSignup({
      fullName: 'Test Signup',
      email,
      phone: '+8801725592014',
      whatsApp: '+15552345678',
      password: 'Secret123!',
    });
    const pending = AuthStore.getPendingSignup(email);
    expect(pending?.phone).toBe('+8801725592014');
    expect(pending?.whatsApp).toBe('+15552345678');

    const user = AuthStore.createUser({
      name: pending.fullName,
      email,
      phone: pending.phone,
      whatsApp: pending.whatsApp,
      password: pending.password,
      isEmailVerified: true,
    });
    expect(user.phone).toBe('+8801725592014');
    expect(user.whatsApp).toBe('+15552345678');
    expect(user.replyEmail).toBe(email);
    AuthStore.clearPendingSignup(email);
    expect(AuthStore.getPendingSignup(email)).toBeNull();
  });

  it('createUser stores WhatsApp alongside phone', () => {
    const email = uniqueEmail('signup-whatsapp');
    const user = AuthStore.createUser({
      name: 'WhatsApp User',
      email,
      phone: '+442071234567',
      whatsApp: '+442071234567',
      password: 'Secret123!',
      isEmailVerified: true,
    });
    expect(user.phone).toBe('+442071234567');
    expect(user.whatsApp).toBe('+442071234567');
  });
});

describe('server-side number validation for signup', () => {
  it('accepts an E.164 number with no dial code to fall back on', () => {
    expect(normalizePhoneNumber('+8801725592014', '')).toBe('+8801725592014');
    expect(normalizePhoneNumber('+15552345678', '')).toBe('+15552345678');
  });

  it('rejects a local number when no dial code is given', () => {
    expect(normalizePhoneNumber('01725592014', '')).toBeNull();
    expect(normalizePhoneNumber('abc', '')).toBeNull();
  });
});
