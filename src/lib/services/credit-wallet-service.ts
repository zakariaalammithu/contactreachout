/**
 * ContactReachout — Credit Wallet & Ledger Service
 * Handles credit balance calculation, priority consumption (FREE first, then PAID),
 * monthly resets, and transaction ledger recording with strict user isolation.
 */

import { PricingService } from './pricing-service';

export interface CreditWallet {
  userId: string;
  planName?: string;
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
  transactionType: 'FREE_MONTHLY_GRANT' | 'PURCHASE' | 'USAGE' | 'BONUS' | 'REFUND' | 'ADMIN_ADJUSTMENT' | 'REFERRAL_BONUS' | 'REFERRAL_SIGNUP_BONUS';
  creditSource: 'FREE' | 'PAID' | 'BONUS';
  amount: number; // Negative for usage, positive for grants/purchases
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  idempotencyKey: string;
  createdAt: string;
}

const STORAGE_KEY_WALLET_PREFIX = 'user_credit_wallet_';
const STORAGE_KEY_TRANSACTIONS_PREFIX = 'user_credit_txs_';

export class CreditWalletService {
  /**
   * Helper to check if current account or userId is an authorized Admin account
   */
  public static isAdminAccount(userId: string): boolean {
    const lower = (userId || '').toLowerCase().trim();
    if (!lower) return false;
    return (
      lower === 'usr_super_admin' ||
      lower === 'mithusquare@gmail.com' ||
      lower === 'superadmin@contactreachout.com'
    );
  }

  /**
   * Gets current period key (e.g., 'usr_default-2026-09')
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
  public static getWallet(userId?: string): CreditWallet {
    const activeEmail =
      typeof window !== 'undefined'
        ? (localStorage.getItem('active_account_email') || '').toLowerCase().trim()
        : '';
    const effectiveUserId = (userId || activeEmail || 'usr_guest').toLowerCase().trim();
    const isAdmin = this.isAdminAccount(effectiveUserId);

    // Free Monthly Grant limit is ALWAYS 100 credits for all users.
    // Admin internal testing credits (1,000,000) are stored in bonusCredits.
    const defaultMonthlyLimit = 100;
    const defaultBonusCredits = isAdmin ? 999900 : 0;
    const defaultTotalAvailable = defaultMonthlyLimit + defaultBonusCredits;

    const storageKey = `${STORAGE_KEY_WALLET_PREFIX}${effectiveUserId}`;

    let wallet: CreditWallet = {
      userId: effectiveUserId,
      planName: isAdmin ? 'Admin / Internal' : 'Free',
      freeMonthlyCredits: defaultMonthlyLimit,
      freeMonthlyUsed: 0,
      paidCredits: 0,
      bonusCredits: defaultBonusCredits,
      totalCreditsAvailable: defaultTotalAvailable,
      lifetimeCreditsPurchased: 0,
      lifetimeCreditsUsed: 0,
      freeCreditPeriodStart: new Date().toISOString(),
      freeCreditPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastResetPeriodKey: this.getPeriodKey(effectiveUserId),
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.userId === effectiveUserId) {
            wallet = { ...wallet, ...parsed };
          }
        } else {
          // First time wallet initialization — record single initial grant transaction
          this.saveWallet(wallet);
          this.recordTransaction(
            {
              id: `tx-init-${Date.now()}`,
              userId: effectiveUserId,
              transactionType: 'FREE_MONTHLY_GRANT',
              creditSource: 'FREE',
              amount: 100,
              balanceBefore: 0,
              balanceAfter: 100,
              description: 'Initial Monthly 100 FREE Credits Grant',
              idempotencyKey: `init-grant-${wallet.lastResetPeriodKey}`,
              createdAt: new Date().toISOString(),
            },
            effectiveUserId
          );
        }
      } catch (err) {
        console.error('Error reading credit wallet:', err);
      }
    }

    // Enforce strict separation: Free Monthly limit is always 100.
    wallet.freeMonthlyCredits = 100;
    if (isAdmin) {
      wallet.planName = 'Admin / Internal';
      if (wallet.bonusCredits < 999900) {
        wallet.bonusCredits = 999900;
      }
    } else {
      wallet.planName = wallet.planName || 'Free';
      wallet.bonusCredits = wallet.bonusCredits || 0;
    }

    // Check for idempotent monthly reset
    const currentPeriodKey = this.getPeriodKey(effectiveUserId);
    if (wallet.lastResetPeriodKey !== currentPeriodKey) {
      wallet = this.processMonthlyReset(wallet, currentPeriodKey);
    }

    // Calculate total available balance: Remaining Free + Paid + Bonus
    const remainingFree = Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed);
    wallet.totalCreditsAvailable = remainingFree + wallet.paidCredits + wallet.bonusCredits;

    return wallet;
  }

  /**
   * Calculates current unreserved available credits for a user.
   * Subtracts reserved prospects of running campaigns from available credits.
   */
  public static getUnreservedAvailableCredits(userId: string): {
    availableCredits: number;
    reservedCredits: number;
    unreservedCredits: number;
    activeCampaignsCount: number;
  } {
    const wallet = this.getWallet(userId);
    const userEmail = (userId || '').toLowerCase().trim();

    let activeCampaignsProspects = 0;
    let activeCampaignsCount = 0;

    if (typeof window !== 'undefined') {
      try {
        const campaigns: any[] = JSON.parse(localStorage.getItem('user_campaigns') || '[]');
        const userCampaigns = campaigns.filter(
          (c) =>
            c.status === 'running' &&
            (c.ownerEmail || '').toLowerCase().trim() === userEmail
        );
        activeCampaignsCount = userCampaigns.length;

        for (const camp of userCampaigns) {
          const total = (camp.prospectsList || []).length || camp.totalLeads || 0;
          const sent = camp.sentCount || 0;
          const remaining = Math.max(0, total - sent);
          activeCampaignsProspects += remaining;
        }
      } catch {}
    }

    const reservedCredits = activeCampaignsProspects;
    const unreservedCredits = Math.max(0, wallet.totalCreditsAvailable - reservedCredits);

    return {
      availableCredits: wallet.totalCreditsAvailable,
      reservedCredits,
      unreservedCredits,
      activeCampaignsCount,
    };
  }

  /**
   * Server-side validation to check whether a user has sufficient unreserved credits to start a campaign.
   */
  public static validateCampaignStart(
    userId: string,
    prospectsCount: number
  ): {
    allowed: boolean;
    reason?: 'INSUFFICIENT_CREDITS' | 'NO_CREDITS_REMAINING';
    availableCredits: number;
    unreservedCredits: number;
    requiredCredits: number;
    shortfall: number;
    message: string;
  } {
    const capacity = this.getUnreservedAvailableCredits(userId);
    const requiredCredits = prospectsCount;
    const availableCredits = capacity.availableCredits;
    const unreservedCredits = capacity.unreservedCredits;

    if (availableCredits <= 0) {
      return {
        allowed: false,
        reason: 'NO_CREDITS_REMAINING',
        availableCredits,
        unreservedCredits,
        requiredCredits,
        shortfall: requiredCredits,
        message: 'You have no credits remaining. Please upgrade your plan to continue.',
      };
    }

    if (unreservedCredits < requiredCredits) {
      const shortfall = requiredCredits - unreservedCredits;
      return {
        allowed: false,
        reason: 'INSUFFICIENT_CREDITS',
        availableCredits,
        unreservedCredits,
        requiredCredits,
        shortfall,
        message: `Not enough credits to start this campaign. Your current plan has ${availableCredits} available credits (${unreservedCredits} unreserved), but this campaign contains ${requiredCredits} prospects. Please upgrade to a paid plan or reduce the number of prospects.`,
      };
    }

    return {
      allowed: true,
      availableCredits,
      unreservedCredits,
      requiredCredits,
      shortfall: 0,
      message: `${requiredCredits} prospects can be processed with your current ${availableCredits} available credits.`,
    };
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

    const remainingFree = 100;
    wallet.totalCreditsAvailable = remainingFree + wallet.paidCredits + wallet.bonusCredits;

    this.saveWallet(wallet);

    this.recordTransaction(
      {
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
      },
      wallet.userId
    );

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
    const idempotencyKey = `usage-${campaignId || 'manual'}-${leadId || 'unknown'}`;
    const userTxs = this.getTransactions(wallet.userId);

    if (userTxs.some((tx) => tx.idempotencyKey === idempotencyKey)) {
      return { success: true, cost: 0, source: 'NONE', wallet };
    }

    if (cost === 0) {
      return { success: true, cost: 0, source: 'NONE', wallet };
    }

    if (wallet.totalCreditsAvailable < cost) {
      return { success: false, cost, source: 'NONE', wallet };
    }

    const balanceBefore = wallet.totalCreditsAvailable;
    let source: 'FREE' | 'PAID' = 'FREE';

    const freeRemaining = Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed);

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

    this.recordTransaction(
      {
        id: `tx-usage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: wallet.userId,
        campaignId,
        leadId,
        transactionType: 'USAGE',
        creditSource: source,
        amount: -cost,
        balanceBefore,
        balanceAfter: wallet.totalCreditsAvailable,
        description: `Outreach Deduction (${resultType}) ${companyName ? 'for ' + companyName : ''}`,
        idempotencyKey,
        createdAt: new Date().toISOString(),
      },
      wallet.userId
    );

    return { success: true, cost, source, wallet };
  }

  /**
   * Adds paid credits after purchase confirmation.
   */
  public static addPaidCredits(
    amount: number = 5000,
    referenceId?: string,
    userId?: string
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

    this.recordTransaction(
      {
        id: `tx-purchase-${Date.now()}`,
        userId: wallet.userId,
        transactionType: 'PURCHASE',
        creditSource: 'PAID',
        amount,
        balanceBefore,
        balanceAfter: wallet.totalCreditsAvailable,
        description: `Purchased ${amount.toLocaleString()} Paid Credits Package`,
        referenceId,
        idempotencyKey: `purchase-${referenceId || Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      wallet.userId
    );

    return wallet;
  }

  /**
   * Adds admin bonus credits or referral/signup bonus credits with canonical transaction logging.
   */
  public static addBonusCredits(
    amount: number,
    reason: string,
    userId?: string
  ): CreditWallet {
    const wallet = this.getWallet(userId);
    const balanceBefore = wallet.totalCreditsAvailable;

    wallet.bonusCredits += amount;
    wallet.totalCreditsAvailable =
      Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed) +
      wallet.paidCredits +
      wallet.bonusCredits;

    this.saveWallet(wallet);

    const isReferralReward = reason.toLowerCase().includes('referral reward') || reason.toLowerCase().includes('qualified referral');
    const isReferralSignup = reason.toLowerCase().includes('referral signup') || reason.toLowerCase().includes('joining through a referral');

    let transactionType: CreditTransaction['transactionType'] = 'ADMIN_ADJUSTMENT';
    if (isReferralReward) {
      transactionType = 'REFERRAL_BONUS';
    } else if (isReferralSignup) {
      transactionType = 'REFERRAL_SIGNUP_BONUS';
    } else if (reason.toLowerCase().includes('bonus')) {
      transactionType = 'BONUS';
    }

    this.recordTransaction(
      {
        id: `tx-bonus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: wallet.userId,
        transactionType,
        creditSource: 'BONUS',
        amount,
        balanceBefore,
        balanceAfter: wallet.totalCreditsAvailable,
        description: reason.startsWith('Bonus:') ? reason : `Bonus: ${reason}`,
        idempotencyKey: `bonus-${Date.now()}-${amount}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      },
      wallet.userId
    );

    return wallet;
  }


  /**
   * Reads transactions strictly for a specific user ID with no duplicate grants.
   */
  public static getTransactions(userId?: string): CreditTransaction[] {
    const activeEmail =
      typeof window !== 'undefined'
        ? (localStorage.getItem('active_account_email') || '').toLowerCase().trim()
        : '';
    const effectiveUserId = (userId || activeEmail || 'usr_guest').toLowerCase().trim();
    const storageKey = `${STORAGE_KEY_TRANSACTIONS_PREFIX}${effectiveUserId}`;

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.error('Error reading user credit transactions:', err);
      }
    }

    const isAdmin = this.isAdminAccount(effectiveUserId);
    const defaultTx: CreditTransaction[] = [
      {
        id: `tx-${effectiveUserId}-001`,
        userId: effectiveUserId,
        transactionType: 'FREE_MONTHLY_GRANT',
        creditSource: 'FREE',
        amount: 100,
        balanceBefore: 0,
        balanceAfter: isAdmin ? 1000000 : 100,
        description: isAdmin
          ? 'Initial Monthly 100 FREE Credits Grant + Admin Internal Balance'
          : 'Initial Monthly 100 FREE Credits Grant',
        idempotencyKey: `init-grant-${effectiveUserId}`,
        createdAt: new Date().toISOString(),
      },
    ];

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(defaultTx));
      } catch {}
    }

    return defaultTx;
  }

  private static saveWallet(wallet: CreditWallet) {
    if (typeof window !== 'undefined') {
      const storageKey = `${STORAGE_KEY_WALLET_PREFIX}${wallet.userId}`;
      localStorage.setItem(storageKey, JSON.stringify(wallet));
    }
  }

  private static recordTransaction(tx: CreditTransaction, userId: string) {
    if (typeof window !== 'undefined') {
      const storageKey = `${STORAGE_KEY_TRANSACTIONS_PREFIX}${userId.toLowerCase().trim()}`;
      const existing = this.getTransactions(userId);
      // Deduplicate by idempotencyKey
      if (existing.some((item) => item.idempotencyKey === tx.idempotencyKey)) {
        return;
      }
      const updated = [tx, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  }
}
