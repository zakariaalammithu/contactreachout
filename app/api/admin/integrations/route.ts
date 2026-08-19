import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const integrations = SecretManager.getAllIntegrationsStatus();

  return NextResponse.json({
    integrations: {
      supabase: {
        name: 'Supabase Database & Auth',
        configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'CONNECTED' : 'NOT_CONFIGURED',
        maskedKey: SecretManager.maskSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      resend: {
        name: 'Resend Transactional Email',
        configured: integrations.RESEND_API_KEY?.configured || false,
        status: integrations.RESEND_API_KEY?.configured ? 'CONNECTED' : 'NOT_CONFIGURED',
        maskedKey: integrations.RESEND_API_KEY?.maskedPreview || 'NOT_CONFIGURED',
      },
      googleSheets: {
        name: 'Google Sheets OAuth & Sync',
        configured: integrations.GOOGLE_CLIENT_ID?.configured || false,
        status: integrations.GOOGLE_CLIENT_ID?.configured ? 'CONNECTED' : 'NOT_CONFIGURED',
        maskedKey: integrations.GOOGLE_CLIENT_ID?.maskedPreview || 'NOT_CONFIGURED',
      },
      openai: {
        name: 'OpenAI API',
        configured: integrations.OPENAI_API_KEY?.configured || false,
        status: integrations.OPENAI_API_KEY?.configured ? 'CONNECTED' : 'NOT_CONFIGURED',
        maskedKey: integrations.OPENAI_API_KEY?.maskedPreview || 'NOT_CONFIGURED',
      },
      anthropic: {
        name: 'Anthropic Claude API',
        configured: integrations.ANTHROPIC_API_KEY?.configured || false,
        status: integrations.ANTHROPIC_API_KEY?.configured ? 'CONNECTED' : 'NOT_CONFIGURED',
        maskedKey: integrations.ANTHROPIC_API_KEY?.maskedPreview || 'NOT_CONFIGURED',
      },
      redis: {
        name: 'Redis BullMQ Queue Broker',
        configured: Boolean(process.env.REDIS_URL || process.env.REDIS_HOST),
        status: Boolean(process.env.REDIS_URL || process.env.REDIS_HOST) ? 'CONNECTED' : 'NOT_CONFIGURED',
        maskedKey: SecretManager.maskSecret(process.env.REDIS_PASSWORD),
      },
    },
  });
}
