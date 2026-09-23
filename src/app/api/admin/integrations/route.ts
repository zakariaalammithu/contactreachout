import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const integrationsStatus = SecretManager.getAllIntegrationsStatus();

    // Check if any secrets are runtime-only (stored in SecretManager vault rather than process.env)
    const runtimeSecretKeys = ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'GOOGLE_CLIENT_ID', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
    const hasRuntimeOnlySecrets = runtimeSecretKeys.some(
      (k) => integrationsStatus[k]?.source === 'user' || integrationsStatus[k]?.source === 'global'
    );

    // 1. Stripe Payment
    const hasStripe = SecretManager.hasSecret('STRIPE_SECRET_KEY') || Boolean(process.env.STRIPE_SECRET_KEY);
    const stripeStatus = hasStripe ? 'CONNECTED' : 'NOT_CONFIGURED';

    // 2. Resend Email
    const hasResend = SecretManager.hasSecret('RESEND_API_KEY') || Boolean(process.env.RESEND_API_KEY);
    const resendStatus = hasResend ? 'CONNECTED' : 'NOT_CONFIGURED';

    // 3. Google Sheets OAuth
    const rawGoogleId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID || '';
    const hasGoogleSecret = SecretManager.hasSecret('GOOGLE_CLIENT_SECRET') || Boolean(process.env.GOOGLE_CLIENT_SECRET);
    const hasGoogle = Boolean(rawGoogleId && !rawGoogleId.includes('@') && hasGoogleSecret);
    const googleSheetsStatus = hasGoogle ? 'CONNECTED' : 'NOT_CONFIGURED';

    // 4. AI Providers
    const hasOpenAI = SecretManager.hasSecret('OPENAI_API_KEY') || Boolean(process.env.OPENAI_API_KEY);
    const hasAnthropic = SecretManager.hasSecret('ANTHROPIC_API_KEY') || Boolean(process.env.ANTHROPIC_API_KEY);
    const aiStatus = (hasOpenAI || hasAnthropic) ? 'CONNECTED' : 'NOT_CONFIGURED';

    // 5. Database / PostgreSQL
    const hasDatabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const databaseStatus = hasDatabase ? 'CONNECTED' : 'NOT_CONFIGURED';

    // 6. Queue & Worker / Redis
    const hasQueue = Boolean(
      process.env.REDIS_URL ||
      process.env.REDIS_HOST ||
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'production'
    );
    const queueStatus = hasQueue ? 'CONNECTED' : 'NOT_CONFIGURED';

    return NextResponse.json({
      success: true,
      hasRuntimeOnlySecrets,
      vaultActive: true,
      integrations: {
        stripe: {
          name: 'Stripe Payments',
          configured: hasStripe,
          status: stripeStatus,
          maskedKey: hasStripe ? SecretManager.getMaskedSecret('STRIPE_SECRET_KEY') : 'NOT_CONFIGURED',
        },
        resend: {
          name: 'Resend Transactional Email',
          configured: hasResend,
          status: resendStatus,
          maskedKey: hasResend ? SecretManager.getMaskedSecret('RESEND_API_KEY') : 'NOT_CONFIGURED',
        },
        googleSheets: {
          name: 'Google Sheets OAuth & Sync',
          configured: hasGoogle,
          status: googleSheetsStatus,
          maskedKey: hasGoogle ? SecretManager.maskSecret(rawGoogleId) : 'NOT_CONFIGURED',
        },
        ai: {
          name: 'AI Personalization (OpenAI / Anthropic)',
          configured: hasOpenAI || hasAnthropic,
          status: aiStatus,
          maskedKey: hasOpenAI
            ? SecretManager.getMaskedSecret('OPENAI_API_KEY')
            : hasAnthropic
            ? SecretManager.getMaskedSecret('ANTHROPIC_API_KEY')
            : 'NOT_CONFIGURED',
        },
        openai: {
          configured: hasOpenAI,
          status: hasOpenAI ? 'CONNECTED' : 'NOT_CONFIGURED',
          maskedKey: hasOpenAI ? SecretManager.getMaskedSecret('OPENAI_API_KEY') : 'NOT_CONFIGURED',
        },
        anthropic: {
          configured: hasAnthropic,
          status: hasAnthropic ? 'CONNECTED' : 'NOT_CONFIGURED',
          maskedKey: hasAnthropic ? SecretManager.getMaskedSecret('ANTHROPIC_API_KEY') : 'NOT_CONFIGURED',
        },
        supabase: {
          name: 'Supabase PostgreSQL & Auth',
          configured: hasDatabase,
          status: databaseStatus,
          maskedKey: SecretManager.maskSecret(process.env.SUPABASE_SERVICE_ROLE_KEY || 'usr_db_active'),
        },
        redis: {
          name: 'Redis Queue Broker',
          configured: hasQueue,
          status: queueStatus,
          maskedKey: SecretManager.maskSecret(process.env.REDIS_PASSWORD || 'usr_queue_active'),
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve integration health.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
