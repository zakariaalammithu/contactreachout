import crypto from 'crypto';
import { SecretManager } from '@/lib/security/secret-manager';
import { PricingService } from '@/lib/services/pricing-service';

export interface StripePurchase {
  credits: number;
  amountCents: number;
  priceId?: string;
  period: 'monthly' | 'yearly';
}

const fixedPrices: Record<number, number> = { 5000: 50, 10000: 99, 100000: 199, 300000: 299 };

export class StripeService {
  static getPurchase(credits: number, period: 'monthly' | 'yearly' = 'monthly'): StripePurchase {
    if (!Number.isSafeInteger(credits) || credits < 1000 || credits > 500000 || credits % 1000 !== 0) {
      throw new Error('Select a valid credit quantity between 1,000 and 500,000.');
    }
    const monthlyPrice = fixedPrices[credits] ?? PricingService.calculateCustomCreditPrice(credits).price;
    const price = period === 'yearly' ? Math.round(monthlyPrice * 12 * 0.8) : monthlyPrice;
    const configuredPriceId = SecretManager.getSecret(`STRIPE_PRICE_ID_${credits}_${period.toUpperCase()}`) || SecretManager.getSecret(`STRIPE_PRICE_ID_${credits}`) || undefined;
    return { credits, amountCents: Math.round(price * 100), priceId: configuredPriceId, period };
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
    try { return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')); } catch { return false; }
  }
}
