import crypto from 'crypto';
import { SecretManager } from '@/lib/security/secret-manager';
import { PricingService, PLAN_PRICING_DETAILS } from '@/lib/services/pricing-service';

export interface StripePurchase {
  credits: number;
  amountCents: number;
  priceId?: string;
  period: 'monthly' | 'yearly';
  interval: 'month' | 'year';
  displayMonthlyPrice: number;
  actualAnnualCharge: number;
  planName: string;
}

export class StripeService {
  static getPurchase(credits: number, period: 'monthly' | 'yearly' = 'monthly'): StripePurchase {
    if (!Number.isSafeInteger(credits) || credits < 1000 || credits > 500000) {
      throw new Error('Select a valid credit quantity between 1,000 and 500,000.');
    }

    const isYearly = period === 'yearly';
    const interval = isYearly ? 'year' : 'month';
    const planDetails = PLAN_PRICING_DETAILS[credits];

    let amountCents: number;
    let displayMonthlyPrice: number;
    let actualAnnualCharge: number;
    let planName: string = planDetails?.name || `${credits.toLocaleString()} Credits`;

    if (planDetails) {
      if (isYearly) {
        displayMonthlyPrice = planDetails.yearlyEffectiveMonthly;
        actualAnnualCharge = planDetails.yearlyAnnualCharge;
        amountCents = Math.round(planDetails.yearlyAnnualCharge * 100);
      } else {
        displayMonthlyPrice = planDetails.monthlyPrice;
        actualAnnualCharge = planDetails.monthlyPrice * 12;
        amountCents = Math.round(planDetails.monthlyPrice * 100);
      }
    } else {
      // Custom Calculator Quantity Interpolation
      const customInfo = PricingService.calculateCustomCreditPrice(credits);
      if (isYearly) {
        displayMonthlyPrice = Math.round(customInfo.price * 0.8);
        actualAnnualCharge = Math.round(displayMonthlyPrice * 12);
        amountCents = Math.round(actualAnnualCharge * 100);
      } else {
        displayMonthlyPrice = customInfo.price;
        actualAnnualCharge = customInfo.price * 12;
        amountCents = Math.round(customInfo.price * 100);
      }
    }

    // Reuse existing secret Price ID if configured in SecretManager
    const priceIdKey = `STRIPE_PRICE_ID_${credits}_${period.toUpperCase()}`;
    const configuredPriceId = SecretManager.getSecret(priceIdKey) || undefined;

    return {
      credits,
      amountCents,
      priceId: configuredPriceId,
      period,
      interval,
      displayMonthlyPrice,
      actualAnnualCharge,
      planName,
    };
  }

  static getSecretKey(): string {
    const key = SecretManager.getSecret('STRIPE_SECRET_KEY');
    if (!key) throw new Error('Stripe is not configured. Contact support.');
    return key;
  }

  static async request(path: string, init?: RequestInit) {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.getSecretKey()}`, ...(init?.headers || {}) },
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Stripe request failed.');
    return data;
  }

  static verifyWebhook(rawBody: string, signatureHeader: string): boolean {
    const secret = SecretManager.getSecret('STRIPE_WEBHOOK_SECRET');
    if (!secret || !signatureHeader) return false;
    const values = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=', 2)));
    const timestamp = values.t;
    const signature = values.v1;
    if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }
}
