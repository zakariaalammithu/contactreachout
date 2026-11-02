import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { AuthStore } from '@/lib/auth/auth-store';

describe('admin-issued reset link tokens', () => {
  it('issues a token that consumes exactly once and changes the password', () => {
    const email = `reset-token-${Date.now()}@example.com`;
    AuthStore.createUser({ email, password: 'old-password-123', name: 'Reset User' });

    const issued = AuthStore.resetPassword(email);
    expect(issued.success).toBe(true);
    expect(typeof issued.resetToken).toBe('string');
    expect(issued.resetToken.length).toBeGreaterThan(20);

    const consumedEmail = AuthStore.consumeResetToken(issued.resetToken, 'new-password-456');
    expect(consumedEmail).toBe(email);

    // Second use must fail (single-use).
    expect(AuthStore.consumeResetToken(issued.resetToken, 'another-password-789')).toBeNull();

    // New password actually verifies; old one does not.
    const user = AuthStore.getUserByEmail(email);
    expect(AuthStore.verifyPassword('new-password-456', user.passwordHash, user.salt)).toBe(true);
    expect(AuthStore.verifyPassword('old-password-123', user.passwordHash, user.salt)).toBe(false);
  });

  it('rejects unknown tokens without revealing anything', () => {
    expect(AuthStore.consumeResetToken('deadbeef'.repeat(8), 'new-password-456')).toBeNull();
  });
});
