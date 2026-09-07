/**
 * Single Source of Truth Pricing & Credit Configuration Service
 * Bulk Contact Form Outreach System
 * 
 * Enforces:
 * - Free Plan: $0/mo, 100 monthly credits (resets to 100 every billing period, non-rollover).
 * - Paid Package: 500 credits for $20 USD (One-time, non-expiring).
 * - Credit Deduction Rules:
 *   - SUCCESSFUL_SUBMISSION: 1.00 credit per submitted message
 *   - AI_PERSONALIZATION: 0.00 credits
 *   - All failed/pre-submission outcomes: 0.00 credits
 *   - Zero-credit outcomes: 0 credit (WEBSITE_UNREACHABLE, NO_CONTACT_PAGE, NO_CONTACT_FORM, CAPTCHA_DETECTED, BOT_PROTECTION, BLOCKED, TIMEOUT, FORM_VALIDATION_FAILURE).
 */

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'one_time';
  credits: number;
  description: string;
  features: string[];
  buttonText: string;
}

export interface CreditRule {
  resultType: string;
  creditCost: number;
  description: string;
}

export interface SystemPricingConfig {
  freePlan: PricingPlan; // 100 Credits Free each month
  package5000: PricingPlan; // 5,000 Credits ($50)
  package10000: PricingPlan; // 10,000 Credits ($99)
  package100000: PricingPlan; // 100,000 Credits ($199)
  package300000: PricingPlan; // 300,000 Credits ($299 Promo - Flat $100 Off)
  creditRules: Record<string, CreditRule>;
  lowCreditThreshold: number;
}

export const DEFAULT_PRICING_CONFIG: SystemPricingConfig = {
  freePlan: {
    id: 'plan_free',
    name: 'Free Plan',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    credits: 100,
    description: '100 free credits every month • No credit card required',
    features: [
      '100 monthly credits',
      'No credit card required',
      'Contact form outreach engine',
      'CSV & Excel import',
      'Basic & live results',
    ],
    buttonText: 'Get Started Free (100 Credits)',
  },
  package5000: {
    id: 'package_5000',
    name: '5,000 Credits',
    price: 50,
    currency: 'USD',
    billingCycle: 'one_time',
    credits: 5000,
    description: '$0.01 per credit • Starter package',
    features: [
      '5,000 credits ($0.01 / credit)',
      'Non-expiring credits',
      'Full contact form processing engine',
      'Detailed results & screenshot proofs',
    ],
    buttonText: 'Buy 5,000 Credits ($50)',
  },
  package10000: {
    id: 'package_10000',
    name: '10,000 Credits',
    price: 99,
    currency: 'USD',
    billingCycle: 'one_time',
    credits: 10000,
    description: '$0.0099 per credit • Growth volume',
    features: [
      '10,000 credits ($0.0099 / credit)',
      'Non-expiring credits',
      'Full contact form processing engine',
      'Detailed results & screenshot proofs',
    ],
    buttonText: 'Buy 10,000 Credits ($99)',
  },
  package100000: {
    id: 'package_100000',
    name: '100,000 Credits',
    price: 199,
    currency: 'USD',
    billingCycle: 'one_time',
    credits: 100000,
    description: '$0.0019 per credit • Scale volume',
    features: [
      '100,000 credits ($0.0019 / credit)',
      'Non-expiring credits',
      'Priority worker queue dispatch',
      'Multi-sequence follow-up support',
    ],
    buttonText: 'Buy 100,000 Credits ($199)',
  },
  package300000: {
    id: 'package_300000',
    name: '300,000 Credits',
    price: 299, // Original 399, Flat 100 Off
    currency: 'USD',
    billingCycle: 'one_time',
    credits: 300000,
    description: 'Promo • $0.0009 per credit • Flat $100 Off',
    features: [
      '300,000 credits ($0.0009 / credit)',
      'Promo: Flat $100 Off (Was $399)',
      'Dedicated worker concurrency pool',
      'Master Inbox & email forwarding sync',
      'Priority 24/7 technical support',
    ],
    buttonText: 'Buy 300,000 Credits ($299)',
  },
  creditRules: {
    SUCCESSFUL_SUBMISSION: {
      resultType: 'SUCCESSFUL_SUBMISSION',
      creditCost: 1.0,
      description: 'One credit for one successfully submitted website contact-form message.',
    },
    AI_PERSONALIZATION: {
      resultType: 'AI_PERSONALIZATION',
      creditCost: 0.0,
      description: 'AI Personalization is included at no credit cost on paid plans.',
    },
    FAILED_SUBMISSION_AFTER_REAL_FORM_ATTEMPT: {
      resultType: 'FAILED_SUBMISSION_AFTER_REAL_FORM_ATTEMPT',
      creditCost: 0.0,
      description: 'No credit is deducted when a message is not successfully submitted.',
    },
    WEBSITE_UNREACHABLE: {
      resultType: 'WEBSITE_UNREACHABLE',
      creditCost: 0.0,
      description: 'Target website domain offline or HTTP error before scanning.',
    },
    NO_CONTACT_PAGE: {
      resultType: 'NO_CONTACT_PAGE',
      creditCost: 0.0,
      description: 'No contact page or inquiry link discovered on domain.',
    },
    NO_CONTACT_FORM: {
      resultType: 'NO_CONTACT_FORM',
      creditCost: 0.0,
      description: 'Contact page found but no submitable HTML form present.',
    },
    CAPTCHA_DETECTED: {
      resultType: 'CAPTCHA_DETECTED',
      creditCost: 0.0,
      description: 'Form protected by reCAPTCHA / hCaptcha / Turnstile.',
    },
    BOT_PROTECTION: {
      resultType: 'BOT_PROTECTION',
      creditCost: 0.0,
      description: 'Cloudflare / WAF blocked automated navigation.',
    },
    BLOCKED: {
      resultType: 'BLOCKED',
      creditCost: 0.0,
      description: 'Domain suppressed or blocked by system compliance rule.',
    },
    TIMEOUT_BEFORE_FORM_PROCESSING: {
      resultType: 'TIMEOUT_BEFORE_FORM_PROCESSING',
      creditCost: 0.0,
      description: 'Navigation timed out before form parsing commenced.',
    },
    FORM_VALIDATION_FAILURE_BEFORE_SUBMISSION: {
      resultType: 'FORM_VALIDATION_FAILURE_BEFORE_SUBMISSION',
      creditCost: 0.0,
      description: 'Required form fields could not be matched safely.',
    },
  },
  lowCreditThreshold: 20,
};

export class PricingService {
  /**
   * Single server-side source of truth for pricing config.
   */
  public static getPricingConfig(): SystemPricingConfig {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_pricing_config_overrides');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...DEFAULT_PRICING_CONFIG,
            ...parsed,
          };
        }
      } catch (err) {
        console.error('Error reading pricing config overrides:', err);
      }
    }
    return DEFAULT_PRICING_CONFIG;
  }

  /**
   * Calculates credit deduction based on finalized submission result.
   */
  public static getCreditCost(resultType: string): number {
    const clean = (resultType || '').toUpperCase().trim();
    if (clean === 'AI_PERSONALIZATION') return 0;
    if (clean === 'SUCCESS' || clean === 'SUBMITTED' || clean === 'SUCCESSFUL_SUBMISSION') return 1;
    if (clean === 'FAILED' || clean === 'SUBMISSION_FAILED' || clean === 'FAILED_SUBMISSION_AFTER_REAL_FORM_ATTEMPT') return 0;
    const config = this.getPricingConfig();
    const rule = config.creditRules[clean];
    if (rule) return rule.creditCost;

    // All protected, unattempted, or pre-submission failure statuses (CAPTCHA, BOT_PROTECTION, NO_FORM, BLOCKED, AUTHENTICATION_REQUIRED, DUPLICATE_PREVENTED, REVIEW_REQUIRED) return 0.0 credit
    return 0.0;
  }

  /**
   * Calculates total price and tier rate for custom requested credit amounts matching exact screenshot rates.
   */
  public static calculateCustomCreditPrice(amount: number): {
    price: number;
    ratePerCredit: number;
    discountPercent: number;
  } {
    const qty = Math.max(1000, Math.min(500000, Math.round(amount)));
    const anchors = [
      { credits: 1000, price: 10 },
      { credits: 5000, price: 50 },
      { credits: 10000, price: 99 },
      { credits: 100000, price: 199 },
      { credits: 300000, price: 299 },
      { credits: 500000, price: 450 },
    ];
    const upperIndex = anchors.findIndex((anchor) => qty <= anchor.credits);
    const upper = anchors[upperIndex === -1 ? anchors.length - 1 : upperIndex];
    const lower = anchors[Math.max(0, (upperIndex === -1 ? anchors.length - 1 : upperIndex) - 1)];
    const progress = upper.credits === lower.credits ? 0 : (qty - lower.credits) / (upper.credits - lower.credits);
    const price = Math.round(lower.price + (upper.price - lower.price) * progress);
    const ratePerCredit = price / qty;
    const discountPercent = Math.max(0, Number(((1 - ratePerCredit / 0.01) * 100).toFixed(1)));

    return {
      price,
      ratePerCredit,
      discountPercent,
    };
  }
}
