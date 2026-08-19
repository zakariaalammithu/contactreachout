import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const hasClientId = SecretManager.hasSecret('GOOGLE_CLIENT_ID');
  const hasClientSecret = SecretManager.hasSecret('GOOGLE_CLIENT_SECRET');

  return NextResponse.json({
    enabled: hasClientId,
    status: hasClientId && hasClientSecret ? 'CONNECTED' : 'NOT_CONFIGURED',
    maskedClientId: SecretManager.getMaskedSecret('GOOGLE_CLIENT_ID'),
    maskedClientSecret: SecretManager.getMaskedSecret('GOOGLE_CLIENT_SECRET'),
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google-sheets/callback',
    allowedScopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { clientId, clientSecret, redirectUri, enabled } = body;

    if (clientId && clientId.trim().length > 0) {
      SecretManager.setSecret('GOOGLE_CLIENT_ID', clientId.trim(), null, 'Google OAuth Client ID');
    }

    if (clientSecret && clientSecret.trim().length > 0) {
      SecretManager.setSecret('GOOGLE_CLIENT_SECRET', clientSecret.trim(), null, 'Google OAuth Client Secret');
    }

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'google_sheets_oauth_updated',
      resourceType: 'integration_google_sheets',
      metadata: { enabled: Boolean(enabled), redirectUri },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Sheets OAuth configuration saved securely.',
      maskedClientId: SecretManager.getMaskedSecret('GOOGLE_CLIENT_ID'),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update Google Sheets settings.' }, { status: 500 });
  }
}
