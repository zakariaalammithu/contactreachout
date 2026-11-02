import { describe, expect, it } from 'vitest';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

const user = (suffix) => `admin-deduct-test-${suffix}@example.com`;

describe('admin credit deduct (in-memory wallet)', () => {
  it('deducts from the free bucket and records a negative ADMIN_ADJUSTMENT', () => {
    const email = user('free');
    CreditWalletService.addBonusCredits(500, 'setup bonus', email, `setup-${email}`);
    const result = CreditWalletService.deductAdminCredits(40, 'Admin deduct by tester: cleanup', email, `deduct-${email}-1`);
    expect(result.success).toBe(true);
    expect(result.deducted).toBe(40);
    // 100 free + 500 bonus - 40 free = 560
    expect(result.wallet.totalCreditsAvailable).toBe(560);
    const tx = CreditWalletService.getTransactions(email).find((t) => t.idempotencyKey === `deduct-${email}-1`);
    expect(tx).toBeDefined();
    expect(tx.transactionType).toBe('ADMIN_ADJUSTMENT');
    expect(tx.amount).toBe(-40);
    expect(tx.creditSource).toBe('FREE');
  });

  it('is idempotent on the same key', () => {
    const email = user('replay');
    const first = CreditWalletService.deductAdminCredits(10, 'Admin deduct', email, `deduct-${email}-r`);
    expect(first.success).toBe(true);
    const second = CreditWalletService.deductAdminCredits(10, 'Admin deduct', email, `deduct-${email}-r`);
    expect(second.success).toBe(true);
    expect(second.deducted).toBe(0);
    expect(second.wallet.totalCreditsAvailable).toBe(first.wallet.totalCreditsAvailable);
  });

  it('rejects a deduct no single bucket covers, without changing the balance', () => {
    const email = user('split');
    // Free 100, bonus 50: total 150 covers 120, but no single bucket does.
    CreditWalletService.addBonusCredits(50, 'setup bonus', email, `setup-${email}`);
    const before = CreditWalletService.getWallet(email).totalCreditsAvailable;
    const result = CreditWalletService.deductAdminCredits(120, 'Admin deduct', email, `deduct-${email}-s`);
    expect(result.success).toBe(false);
    expect(result.error).toMatch('single bucket');
    expect(CreditWalletService.getWallet(email).totalCreditsAvailable).toBe(before);
  });

  it('rejects a deduct above the total balance', () => {
    const email = user('over');
    const result = CreditWalletService.deductAdminCredits(101, 'Admin deduct', email, `deduct-${email}-o`);
    expect(result.success).toBe(false);
    expect(CreditWalletService.getWallet(email).totalCreditsAvailable).toBe(100);
  });
});
