import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { PricingService } from './pricing-service';
import {
  CreditWalletService,
  type CreditTransaction,
  type CreditWallet,
} from './credit-wallet-service';

/** Server-only durable adapter for the browser-safe credit wallet service. */
export class CreditWalletServerService {
  private static async getDatabaseUserId(userEmail: string): Promise<string> {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error('CREDIT_DATABASE_NOT_CONFIGURED');
    const { data, error } = await client
      .from('users')
      .select('id')
      .eq('email', userEmail.toLowerCase().trim())
      .maybeSingle();
    if (error) throw new Error(`CREDIT_DATABASE_USER_LOOKUP_FAILED: ${error.message}`);
    if (!data?.id) throw new Error('CREDIT_DATABASE_USER_NOT_FOUND: provision the authenticated user in public.users before using credits.');
    return data.id as string;
  }

  private static walletFromDatabase(row: any, userId: string): CreditWallet {
    const freeMonthlyCredits = Number(row.free_monthly_credits ?? 100);
    const freeMonthlyUsed = Number(row.free_monthly_used ?? 0);
    const paidCredits = Number(row.paid_credits ?? 0);
    const bonusCredits = Number(row.bonus_credits ?? 0);
    return {
      userId,
      planName: 'Database',
      freeMonthlyCredits,
      freeMonthlyUsed,
      paidCredits,
      bonusCredits,
      totalCreditsAvailable: Math.max(0, freeMonthlyCredits - freeMonthlyUsed) + paidCredits + bonusCredits,
      lifetimeCreditsPurchased: Number(row.lifetime_credits_purchased ?? 0),
      lifetimeCreditsUsed: Number(row.lifetime_credits_used ?? 0),
      freeCreditPeriodStart: row.free_credit_period_start,
      freeCreditPeriodEnd: row.free_credit_period_end,
      lastResetPeriodKey: `${userId}-${String(row.free_credit_period_start || '').slice(0, 7)}`,
    };
  }

  private static transactionFromDatabase(row: any, userId: string): CreditTransaction {
    return {
      id: row.id,
      userId,
      campaignId: row.campaign_id || undefined,
      leadId: row.lead_id || undefined,
      transactionType: row.transaction_type,
      creditSource: row.credit_source,
      amount: Number(row.amount),
      balanceBefore: Number(row.balance_before),
      balanceAfter: Number(row.balance_after),
      description: row.description,
      referenceId: row.reference_id || undefined,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at,
    };
  }

  public static async getWalletForServer(userId: string): Promise<CreditWallet> {
    const client = getSupabaseAdminClient();
    if (!client) return CreditWalletService.getWallet(userId);
    // Accounts that were created in the app but never provisioned in
    // public.users have no database wallet. Failing their starts and
    // submissions with CREDIT_DATABASE_USER_NOT_FOUND blocks all outreach
    // for them, so fall back to the standard in-memory wallet (100 free
    // monthly credits, plus the admin testing grant for admin accounts) —
    // the same fallback already used when Supabase is not configured.
    // Provisioning the missing users row is a separate, owner-approved
    // data decision; until then this keeps every account able to send.
    // Any other database failure still surfaces as an error.
    let databaseUserId: string;
    try {
      databaseUserId = await this.getDatabaseUserId(userId);
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('CREDIT_DATABASE_USER_NOT_FOUND') || message.includes('CREDIT_DATABASE_NOT_CONFIGURED')) {
        return CreditWalletService.getWallet(userId);
      }
      throw err;
    }
    const { data, error } = await client.from('credit_wallets').select('*').eq('user_id', databaseUserId).maybeSingle();
    if (error) throw new Error(`CREDIT_DATABASE_READ_FAILED: ${error.message}`);
    if (data) return this.walletFromDatabase(data, userId);
    const initialized = await this.applyDatabaseTransaction({
      userId,
      amount: 0,
      transactionType: 'FREE_MONTHLY_GRANT',
      creditSource: 'FREE',
      description: 'Database wallet initialization',
      idempotencyKey: `database-wallet-initialization-${databaseUserId}`,
    });
    return initialized.wallet;
  }

  public static async getTransactionsForServer(userId: string): Promise<CreditTransaction[]> {
    const client = getSupabaseAdminClient();
    if (!client) return CreditWalletService.getTransactions(userId);
    const databaseUserId = await this.getDatabaseUserId(userId);
    const { data, error } = await client.from('credit_ledger').select('*').eq('user_id', databaseUserId).order('created_at', { ascending: false });
    if (error) throw new Error(`CREDIT_DATABASE_LEDGER_READ_FAILED: ${error.message}`);
    return (data || []).map((row) => this.transactionFromDatabase(row, userId));
  }

  private static async applyDatabaseTransaction(input: {
    userId: string;
    amount: number;
    transactionType: CreditTransaction['transactionType'];
    creditSource: 'FREE' | 'PAID' | 'BONUS';
    description: string;
    idempotencyKey: string;
    campaignId?: string;
    leadId?: string;
    referenceId?: string;
  }): Promise<{ wallet: CreditWallet; transaction: CreditTransaction; applied: boolean }> {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error('CREDIT_DATABASE_NOT_CONFIGURED');
    const databaseUserId = await this.getDatabaseUserId(input.userId);
    const { data: rawData, error } = await client.rpc('apply_credit_transaction', {
      p_user_id: databaseUserId,
      p_amount: input.amount,
      p_transaction_type: input.transactionType,
      p_credit_source: input.creditSource,
      p_description: input.description,
      p_idempotency_key: input.idempotencyKey,
      p_campaign_id: input.campaignId || null,
      p_lead_id: input.leadId || null,
      p_reference_id: input.referenceId || null,
    }).single();
    const data = rawData as { wallet?: Record<string, unknown>; transaction?: Record<string, unknown>; applied?: boolean } | null;
    if (error || !data?.wallet || !data?.transaction) {
      throw new Error(`CREDIT_DATABASE_TRANSACTION_FAILED: ${error?.message || 'invalid RPC response'}`);
    }
    return {
      wallet: this.walletFromDatabase(data.wallet, input.userId),
      transaction: this.transactionFromDatabase(data.transaction, input.userId),
      applied: Boolean(data.applied),
    };
  }

  public static async deductCreditsForServer(
    resultType: string,
    campaignId: string | undefined,
    leadId: string | undefined,
    companyName: string | undefined,
    userId: string
  ): Promise<{ success: boolean; cost: number; source: 'FREE' | 'PAID' | 'BONUS' | 'NONE'; wallet: CreditWallet }> {
    const cost = PricingService.getCreditCost(resultType);
    if (cost === 0) return { success: true, cost: 0, source: 'NONE', wallet: await this.getWalletForServer(userId) };
    if (!getSupabaseAdminClient()) return CreditWalletService.deductCredits(resultType, campaignId, leadId, companyName, userId);
    try {
      const outcome = await this.applyDatabaseTransaction({
        userId, amount: -cost, transactionType: 'USAGE', creditSource: 'FREE',
        description: `Outreach Deduction (${resultType})${companyName ? ` for ${companyName}` : ''}`,
        idempotencyKey: `usage-${campaignId || 'manual'}-${leadId || 'unknown'}`,
        campaignId, leadId,
      });
      return { success: true, cost: outcome.applied ? cost : 0, source: outcome.transaction.creditSource, wallet: outcome.wallet };
    } catch (error) {
      if (error instanceof Error && error.message.includes('INSUFFICIENT_CREDITS')) {
        return { success: false, cost, source: 'NONE', wallet: await this.getWalletForServer(userId) };
      }
      // Same unprovisioned-account fallback as getWalletForServer: a
      // successful submission must still deduct from the standard
      // in-memory wallet instead of failing the whole submission.
      if (error instanceof Error && (error.message.includes('CREDIT_DATABASE_USER_NOT_FOUND') || error.message.includes('CREDIT_DATABASE_NOT_CONFIGURED'))) {
        return CreditWalletService.deductCredits(resultType, campaignId, leadId, companyName, userId);
      }
      throw error;
    }
  }

  public static async addBonusCreditsForServer(
    amount: number, reason: string, userId: string, idempotencyKey: string
  ): Promise<{ wallet: CreditWallet; transaction?: CreditTransaction }> {
    if (!getSupabaseAdminClient()) {
      const wallet = CreditWalletService.addBonusCredits(amount, reason, userId, idempotencyKey);
      return { wallet, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === idempotencyKey) };
    }
    try {
      const outcome = await this.applyDatabaseTransaction({
        userId, amount, transactionType: 'ADMIN_ADJUSTMENT', creditSource: 'BONUS', description: reason, idempotencyKey,
      });
      return { wallet: outcome.wallet, transaction: outcome.transaction };
    } catch (error) {
      // Same unprovisioned-account fallback as paid credits: an admin grant
      // to a user with no public.users row lands in the in-memory wallet
      // instead of 500ing (the grant's target resolution already verified
      // the email against AuthStore or the durable users table).
      if (error instanceof Error && error.message.includes('CREDIT_DATABASE_USER_NOT_FOUND')) {
        const wallet = CreditWalletService.addBonusCredits(amount, reason, userId, idempotencyKey);
        return { wallet, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === idempotencyKey) };
      }
      throw error;
    }
  }

  public static async addPaidCreditsForServer(
    amount: number, referenceId: string, userId: string
  ): Promise<{ wallet: CreditWallet; transaction?: CreditTransaction }> {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid paid credit amount.');
    if (!getSupabaseAdminClient()) {
      const wallet = CreditWalletService.addPaidCredits(amount, referenceId, userId);
      return { wallet, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === `purchase-${referenceId}`) };
    }
    try {
      const outcome = await this.applyDatabaseTransaction({
        userId, amount, transactionType: 'PURCHASE', creditSource: 'PAID',
        description: `Stripe purchase ${referenceId}`,
        idempotencyKey: `stripe-purchase-${referenceId}`,
        referenceId,
      });
      return { wallet: outcome.wallet, transaction: outcome.transaction };
    } catch (error) {
      // Same unprovisioned-account fallback as deductions: public.users rows
      // are keyed by Supabase Auth id + organization, which the app's own
      // auth cannot mint — so a payer without a row must still receive
      // their credits, in the same in-memory wallet their sends deduct
      // from. Durable crediting resumes automatically once a users row
      // exists (the DB path above runs first whenever the lookup succeeds).
      // A durable identity fix needs a schema decision (see report); until
      // then this fallback is strictly better than charging without credit.
      if (error instanceof Error && error.message.includes('CREDIT_DATABASE_USER_NOT_FOUND')) {
        const wallet = CreditWalletService.addPaidCredits(amount, referenceId, userId);
        return { wallet, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === `purchase-${referenceId}`) };
      }
      throw error;
    }
  }

  /** Subscription renewal grant: same PURCHASE/PAID shape, keyed by invoice id. */
  public static async addRenewalCreditsForServer(
    amount: number, invoiceId: string, userId: string
  ): Promise<{ wallet: CreditWallet; transaction?: CreditTransaction }> {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid renewal credit amount.');
    if (!getSupabaseAdminClient()) {
      const wallet = CreditWalletService.addPaidCredits(amount, `renewal-${invoiceId}`, userId);
      return { wallet, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === `purchase-renewal-${invoiceId}`) };
    }
    try {
      const outcome = await this.applyDatabaseTransaction({
        userId, amount, transactionType: 'PURCHASE', creditSource: 'PAID',
        description: `Stripe subscription renewal ${invoiceId}`,
        idempotencyKey: `stripe-renewal-${invoiceId}`,
        referenceId: invoiceId,
      });
      return { wallet: outcome.wallet, transaction: outcome.transaction };
    } catch (error) {
      if (error instanceof Error && error.message.includes('CREDIT_DATABASE_USER_NOT_FOUND')) {
        const wallet = CreditWalletService.addPaidCredits(amount, `renewal-${invoiceId}`, userId);
        return { wallet, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === `purchase-renewal-${invoiceId}`) };
      }
      throw error;
    }
  }

  /**
   * Reverses paid credits for a Stripe refund, capped at the paid balance
   * (never a negative balance). Returns the reversed amount and any
   * shortfall for admin review. Note: the RPC's negative path consumes by
   * its own bucket order (FREE first), so the ledger's creditSource on a
   * refund may differ from PAID — the total movement is exact, and a
   * source-respecting RPC parameter is a drafted follow-up migration.
   */
  public static async recordRefundForServer(
    amount: number, refundId: string, sessionId: string | undefined, userId: string
  ): Promise<{ wallet: CreditWallet; transaction?: CreditTransaction; refundedCredits: number; shortfall: number }> {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid refund credit amount.');
    if (!getSupabaseAdminClient()) {
      const result = CreditWalletService.recordRefund(amount, refundId, sessionId, userId);
      return { ...result, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === `stripe-refund-${refundId}`) };
    }
    const wallet = await this.getWalletForServer(userId);
    const refundedCredits = Math.max(0, Math.min(amount, wallet.paidCredits));
    const shortfall = Math.max(0, amount - refundedCredits);
    if (refundedCredits <= 0) {
      return { wallet, transaction: undefined, refundedCredits: 0, shortfall };
    }
    try {
      const outcome = await this.applyDatabaseTransaction({
        userId, amount: -refundedCredits, transactionType: 'REFUND', creditSource: 'PAID',
        description: `Stripe refund ${refundId}${sessionId ? ` (original purchase ${sessionId})` : ''}${shortfall > 0 ? ` — ${shortfall} credits shortfall, admin review needed` : ''}`,
        idempotencyKey: `stripe-refund-${refundId}`,
        referenceId: sessionId,
      });
      return { wallet: outcome.wallet, transaction: outcome.transaction, refundedCredits, shortfall };
    } catch (error) {
      if (error instanceof Error && error.message.includes('CREDIT_DATABASE_USER_NOT_FOUND')) {
        const result = CreditWalletService.recordRefund(amount, refundId, sessionId, userId);
        return { ...result, transaction: CreditWalletService.getTransactions(userId).find((item) => item.idempotencyKey === `stripe-refund-${refundId}`) };
      }
      throw error;
    }
  }

  /** Original PURCHASE grant for a checkout session (DB path; null when absent). */
  public static async getPurchaseGrantBySession(sessionId: string): Promise<{ credits: number } | null> {
    const client = getSupabaseAdminClient();
    if (!client) return null;
    const { data, error } = await client
      .from('credit_ledger')
      .select('amount')
      .eq('idempotency_key', `stripe-purchase-${sessionId}`)
      .eq('transaction_type', 'PURCHASE')
      .maybeSingle();
    if (error || !data) return null;
    return { credits: Number(data.amount) || 0 };
  }
}
