import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;
  const creditOptions = [5000, 10000, 100000, 300000];
  const info = SecretManager.getSecretInfo('STRIPE_SECRET_KEY');
  const webhookInfo = SecretManager.getSecretInfo('STRIPE_WEBHOOK_SECRET');

  return NextResponse.json({
    configured: info.configured,
    maskedApiKey: info.maskedPreview,
    source: info.source,
    sourceText: info.sourceText,
    isOverrideActive: info.isOverrideActive,
    webhookConfigured: webhookInfo.configured,
    webhookSourceText: webhookInfo.sourceText,
    priceIds: Object.fromEntries(
      creditOptions.flatMap((credits) => [
        [credits, SecretManager.getMaskedSecret(`STRIPE_PRICE_ID_${credits}_MONTHLY`)],
        ['' + credits + '_MONTHLY', SecretManager.getMaskedSecret(`STRIPE_PRICE_ID_${credits}_MONTHLY`)],
        ['' + credits + '_YEARLY', SecretManager.getMaskedSecret(`STRIPE_PRICE_ID_${credits}_YEARLY`)],
      ])
    ),
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;
  try {
    const { action, apiKey, webhookSecret, priceIds } = await req.json();
    const submittedKey = typeof apiKey === 'string' ? apiKey.trim() : '';

    if (action === 'clear_override') {
      SecretManager.deleteSecret('STRIPE_SECRET_KEY');
      const info = SecretManager.getSecretInfo('STRIPE_SECRET_KEY');
      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'stripe_override_cleared',
        resourceType: 'integration_stripe',
        metadata: {},
      });
      return NextResponse.json({
        success: true,
        message: 'Stripe vault override cleared. System reverted to Server Environment key.',
        maskedApiKey: info.maskedPreview,
        source: info.source,
        sourceText: info.sourceText,
        isOverrideActive: info.isOverrideActive,
      });
    }

    if (action === 'save') {
      if (!submittedKey.startsWith('sk_') || submittedKey.length < 20) return NextResponse.json({ error: 'Enter a valid Stripe secret key.' }, { status: 400 });
      SecretManager.setSecret('STRIPE_SECRET_KEY', submittedKey, null, 'Global Stripe Secret Key');
      const info = SecretManager.getSecretInfo('STRIPE_SECRET_KEY');
      AuditLogService.log({ userId: session.userId, userEmail: session.email, action: 'stripe_key_updated', resourceType: 'integration_stripe', metadata: {} });
      return NextResponse.json({
        success: true,
        maskedApiKey: info.maskedPreview,
        source: info.source,
        sourceText: info.sourceText,
        isOverrideActive: info.isOverrideActive,
        message: 'Stripe key saved in encrypted vault override.',
      });
    }

    if (action === 'save_settings') {
      if (typeof webhookSecret === 'string' && webhookSecret.trim()) {
        if (!webhookSecret.trim().startsWith('whsec_')) return NextResponse.json({ error: 'Enter a valid Stripe webhook signing secret.' }, { status: 400 });
        SecretManager.setSecret('STRIPE_WEBHOOK_SECRET', webhookSecret.trim(), null, 'Stripe webhook signing secret');
      }
      for (const credits of [5000, 10000, 100000, 300000]) for (const period of ['MONTHLY', 'YEARLY']) {
        const submitted = priceIds?.[`${credits}_${period}`] ?? (period === 'MONTHLY' ? priceIds?.[credits] : '');
        const priceId = typeof submitted === 'string' ? submitted.trim() : '';
        if (priceId) {
          if (!priceId.startsWith('price_')) return NextResponse.json({ error: `Invalid Stripe ${period.toLowerCase()} Price ID for ${credits.toLocaleString()} credits.` }, { status: 400 });
          SecretManager.setSecret(`STRIPE_PRICE_ID_${credits}_${period}`, priceId, null, `Stripe ${period.toLowerCase()} Price ID for ${credits} credits`);
        }
      }
      AuditLogService.log({ userId: session.userId, userEmail: session.email, action: 'stripe_checkout_settings_updated', resourceType: 'integration_stripe', metadata: {} });
      return NextResponse.json({ success: true, message: 'Stripe checkout settings saved securely.' });
    }

    if (action === 'test') {
      const key = submittedKey || SecretManager.getSecret('STRIPE_SECRET_KEY');
      if (!key) return NextResponse.json({ error: 'Configure a Stripe secret key first.' }, { status: 400 });
      const stripeResponse = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
      if (!stripeResponse.ok) return NextResponse.json({ error: `Stripe rejected the credential (${stripeResponse.status}).` }, { status: 400 });
      return NextResponse.json({ success: true, message: 'Stripe API connection verified.' });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unable to update Stripe settings.' }, { status: 500 });
  }
}

