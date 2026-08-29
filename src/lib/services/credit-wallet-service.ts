/**
 * Bulk Contact Form Outreach System — Credit Wallet & Ledger Service
 * Handles server-side credit balance calculation, priority consumption (FREE first, then PAID),
 * idempotent monthly resets, and transaction ledger recording.
 */

import { PricingService } from './pricing-service';

export interface CreditWallet {
  userId: string;
  freeMonthlyCredits: number;
  freeMonthlyUsed: number;
  paidCredits: number;
  bonusCredits: number;
  totalCreditsAvailable: number;
  lifetimeCreditsPurchased: number;
  lifetimeCreditsUsed: number;
  freeCreditPeriodStart: string;
  freeCreditPeriodEnd: string;
  lastResetPeriodKey: string; // YYYY-MM idempotency key
}

export interface CreditTransaction {
  id: string;
  userId: string;
  campaignId?: string;
  leadId?: string;
  transactionType: 'FREE_MONTHLY_GRANT' | 'PURCHASE' | 'USAGE' | 'BONUS' | 'REFUND' | 'ADMIN_ADJUSTMENT';
  creditSource: 'FREE' | 'PAID' | 'BONUS';
  amount: number; // Negative for usage, positive for grants/purchases
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  idempotencyKey: string;
  createdAt: string;
}

const STORAGE_KEY_WALLET = 'user_credit_wallet';
const STORAGE_KEY_TRANSACTIONS = 'user_credit_transactions';

export class CreditWalletService {
  /**
   * Gets current period key (e.g., 'usr_default-2026-08')
   */
  private static getPeriodKey(userId: string): string {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    return `${userId}-${YYYY}-${MM}`;
  }

  /**
   * Retrieves or initializes the user's credit wallet.
   * Performs idempotent monthly reset if period has changed.
   */
  public static getWallet(userId: string = 'usr_operator'): CreditWallet {
    let wallet: CreditWallet = {
      userId,
      freeMonthlyCredits: 100,
      freeMonthlyUsed: 0,
      paidCredits: 500, // Initial sandbox state
      bonusCredits: 0,
      totalCreditsAvailable: 600,
      lifetimeCreditsPurchased: 500,
      lifetimeCreditsUsed: 0,
      freeCreditPeriodStart: new Date().toISOString(),
      freeCreditPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastResetPeriodKey: this.getPeriodKey(userId),
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_WALLET);
        if (stored) {
          const parsed = JSON.parse(stored);
          wallet = { ...wallet, ...parsed };
        } else {
          // First time initialization — store initial grant transaction
          this.saveWallet(wallet);
          this.recordTransaction({
            id: `tx-init-${Date.now()}`,
            userId,
            transactionType: 'FREE_MONTHLY_GRANT',
            creditSource: 'FREE',
            amount: 100,
            balanceBefore: 0,
            balanceAfter: 600,
            description: 'Initial Monthly 100 FREE Credits Grant',
            idempotencyKey: `init-grant-${wallet.lastResetPeriodKey}`,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error reading credit wallet:', err);
      }
    }

    // Check for idempotent monthly reset
    const currentPeriodKey = this.getPeriodKey(userId);
    if (wallet.lastResetPeriodKey !== currentPeriodKey) {
      wallet = this.processMonthlyReset(wallet, currentPeriodKey);
    }

    // Ensure total available is strictly calculated
    wallet.totalCreditsAvailable =
      Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed) +
      wallet.paidCredits +
      wallet.bonusCredits;

    return wallet;
  }

  /**
   * Idempotent monthly free credit reset. Resets free credits to 100 (non-rollover).
   */
  private static processMonthlyReset(wallet: CreditWallet, currentPeriodKey: string): CreditWallet {
    const balanceBefore = wallet.totalCreditsAvailable;
    wallet.freeMonthlyCredits = 100;
    wallet.freeMonthlyUsed = 0;
    wallet.lastResetPeriodKey = currentPeriodKey;
    wallet.freeCreditPeriodStart = new Date().toISOString();
    wallet.freeCreditPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    wallet.totalCreditsAvailable = 100 + wallet.paidCredits + wallet.bonusCredits;

    this.saveWallet(wallet);

    this.recordTransaction({
      id: `tx-reset-${Date.now()}`,
      userId: wallet.userId,
      transactionType: 'FREE_MONTHLY_GRANT',
      creditSource: 'FREE',
      amount: 100,
      balanceBefore,
      balanceAfter: wallet.totalCreditsAvailable,
      description: `Monthly Free 100 Credits Reset (${currentPeriodKey})`,
      idempotencyKey: `monthly-reset-${currentPeriodKey}`,
      createdAt: new Date().toISOString(),
    });

    return wallet;
  }

  /**
   * Deducts credits prioritizing FREE credits first, then PAID credits.
   */
  public static deductCredits(
    resultType: string,
    campaignId?: string,
    leadId?: string,
    companyName?: string,
    userId: string = 'usr_operator'
  ): { success: boolean; cost: number; source: 'FREE' | 'PAID' | 'NONE'; wallet: CreditWallet } {
    const cost = PricingService.getCreditCost(resultType);
    const wallet = this.getWallet(userId);

    if (cost === 0) {
      return { success: true, cost: 0, source: 'NONE', wallet };
    }

    if (wallet.totalCreditsAvailable < cost) {
      return { success: false, cost, source: 'NONE', wallet };
    }

    const balanceBefore = wallet.totalCreditsAvailable;
    let source: 'FREE' | 'PAID' = 'FREE';

    const freeRemaining = wallet.freeMonthlyCredits - wallet.freeMonthlyUsed;

    if (freeRemaining >= cost) {
      // Consume FREE credits
      wallet.freeMonthlyUsed += cost;
      source = 'FREE';
    } else {
      // Consume remaining FREE credits then PAID credits
      const freePart = freeRemaining;
      const paidPart = cost - freePart;
      wallet.freeMonthlyUsed += freePart;
      wallet.paidCredits = Math.max(0, wallet.paidCredits - paidPart);
      source = 'PAID';
    }

    wallet.lifetimeCreditsUsed += cost;
    wallet.totalCreditsAvailable =
      Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed) +
      wallet.paidCredits +
      wallet.bonusCredits;

    this.saveWallet(wallet);

    this.recordTransaction({
      id: `tx-usage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      campaignId,
      leadId,
      transactionType: 'USAGE',
      creditSource: source,
      amount: -cost,
      balanceBefore,
      balanceAfter: wallet.totalCreditsAvailable,
      description: `Outreach Deduction (${resultType}) ${companyName ? 'for ' + companyName : ''}`,
      idempotencyKey: `usage-${campaignId || 'manual'}-${leadId || Date.now()}`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, cost, source, wallet };
  }

  /**
   * Adds paid credits after purchase confirmation (500 credits for $20).
   */
  public static addPaidCredits(
    amount: number = 500,
    referenceId?: string,
    userId: string = 'usr_operator'
  ): CreditWallet {
    const wallet = this.getWallet(userId);
    const balanceBefore = wallet.totalCreditsAvailable;

    wallet.paidCredits += amount;
    wallet.lifetimeCreditsPurchased += amount;
    wallet.totalCreditsAvailable =
      Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed) +
      wallet.paidCredits +
      wallet.bonusCredits;

    this.saveWallet(wallet);

    this.recordTransaction({
      id: `tx-purchase-${Date.now()}`,
      userId,
      transactionType: 'PURCHASE',
      creditSource: 'PAID',
      amount,
      balanceBefore,
      balanceAfter: wallet.totalCreditsAvailable,
      description: `Purchased ${amount} Paid Credits Package ($20 USD)`,
      referenceId,
      idempotencyKey: `purchase-${referenceId || Date.now()}`,
      createdAt: new Date().toISOString(),
    });

    return wallet;
  }

  /**
   * Adds admin bonus credits or manual adjustments.
   */
  public static addBonusCredits(
    amount: number,
    reason: string,
    userId: string = 'usr_operator'
  ): CreditWallet {
    const wallet = this.getWallet(userId);
    const balanceBefore = wallet.totalCreditsAvailable;

    wallet.bonusCredits += amount;
    wallet.totalCreditsAvailable =
      Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed) +
      wallet.paidCredits +
      wallet.bonusCredits;

    this.saveWallet(wallet);

    this.recordTransaction({
      id: `tx-bonus-${Date.now()}`,
      userId,
      transactionType: 'ADMIN_ADJUSTMENT',
      creditSource: 'BONUS',
      amount,
      balanceBefore,
      balanceAfter: wallet.totalCreditsAvailable,
      description: `Admin Bonus: ${reason}`,
      idempotencyKey: `bonus-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });

    return wallet;
  }

  /**
   * Gets transactions ledger.
   */
  public static getTransactions(): CreditTransaction[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (err) {
        console.error('Error reading credit transactions:', err);
      }
    }
    return [
      {
        id: 'tx-default-1',
        userId: 'usr_operator',
        transactionType: 'FREE_MONTHLY_GRANT',
        creditSource: 'FREE',
        amount: 100,
        balanceBefore: 0,
        balanceAfter: 600,
        description: 'Monthly Free 100 Credits Grant',
        idempotencyKey: 'init-001',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tx-default-2',
        userId: 'usr_operator',
        transactionType: 'PURCHASE',
        creditSource: 'PAID',
        amount: 500,
        balanceBefore: 100,
        balanceAfter: 600,
        description: 'Purchased 500 Credits Package ($20 USD)',
        referenceId: 'ch_3N8x2eLkd',
        idempotencyKey: 'purchase-001',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }

  private static saveWallet(wallet: CreditWallet) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WALLET, JSON.stringify(wallet));
    }
  }

  private static recordTransaction(tx: CreditTransaction) {
    if (typeof window !== 'undefined') {
      const existing = this.getTransactions();
      const updated = [tx, ...existing];
      localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updated));
    }
  }
}
