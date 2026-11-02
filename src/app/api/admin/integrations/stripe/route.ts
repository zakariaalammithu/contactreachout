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
      return NextResponse.json(
        { error: 'API keys are managed via server environment only. Set or remove this value in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
        { status: 410 },
      );
    }

    if (action === 'save') {
      return NextResponse.json(
        { error: 'API keys are managed via server environment only. Set STRIPE_SECRET_KEY in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
        { status: 410 },
      );
    }

    if (action === 'save_settings') {
      return NextResponse.json(
        { error: 'API keys are managed via server environment only. Set STRIPE_WEBHOOK_SECRET in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
        { status: 410 },
      );
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

