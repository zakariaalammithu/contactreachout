import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const rawClientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID || '';
    const hasClientSecret = SecretManager.hasSecret('GOOGLE_CLIENT_SECRET') || Boolean(process.env.GOOGLE_CLIENT_SECRET);

    const clientIdInfo = SecretManager.getSecretInfo('GOOGLE_CLIENT_ID');
    const secretInfo = SecretManager.getSecretInfo('GOOGLE_CLIENT_SECRET');

    // OAuth Client ID must NOT be an email address
    const isValidClientIdFormat = Boolean(
      rawClientId &&
      rawClientId.trim().length > 0 &&
      !rawClientId.includes('@') &&
      (rawClientId.includes('.apps.googleusercontent.com') || rawClientId.length > 10)
    );

    const isConfigured = isValidClientIdFormat && hasClientSecret;

    // Determine dynamic callback URI based on actual incoming request origin
    const host = req.headers.get('host') || 'localhost:3001';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const defaultDynamicRedirectUri = `${protocol}://${host}/api/admin/integrations/google-sheets/callback`;
    const redirectUri = SecretManager.getSecret('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI || defaultDynamicRedirectUri;

    return NextResponse.json({
      success: true,
      enabled: isConfigured,
      isConfigured: isConfigured,
      statusText: clientIdInfo.sourceText,
      source: clientIdInfo.source,
      isOverrideActive: clientIdInfo.isOverrideActive || secretInfo.isOverrideActive,
      maskedClientId: isValidClientIdFormat ? clientIdInfo.maskedPreview : 'NOT_CONFIGURED',
      maskedClientSecret: hasClientSecret ? secretInfo.maskedPreview : 'NOT_CONFIGURED',
      redirectUri,
      allowedScopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve Google Sheets configuration.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { clientId, clientSecret, redirectUri, enabled, action } = body;

    // 0. Action: Clear Override — DISABLED under environment-only mode
    // (2026-11-02): dashboard key editing is removed; OAuth values
    // come only from server environment.
    if (action === 'clear_override') {
      return NextResponse.json(
        { error: 'API keys are managed via server environment only. Set or remove GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
        { status: 410 },
      );
    }

    // Save — DISABLED under environment-only mode (2026-11-02).
    return NextResponse.json(
      { error: 'API keys are managed via server environment only. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
      { status: 410 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update Google Sheets settings.' },
      { status: 500 }
    );
  }
}

