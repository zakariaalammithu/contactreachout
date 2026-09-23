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
      statusText: isConfigured ? 'Configured' : 'Not Configured',
      maskedClientId: isValidClientIdFormat ? SecretManager.maskSecret(rawClientId) : 'NOT_CONFIGURED',
      maskedClientSecret: hasClientSecret ? SecretManager.getMaskedSecret('GOOGLE_CLIENT_SECRET') : 'NOT_CONFIGURED',
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
    const { clientId, clientSecret, redirectUri, enabled } = body;

    // Server-side validation: Client ID format check
    if (clientId && clientId.trim().length > 0) {
      const cleanClientId = clientId.trim();
      if (cleanClientId.includes('@')) {
        return NextResponse.json(
          {
            error:
              'Invalid Google OAuth Client ID: Email addresses (e.g., user@gmail.com) cannot be used as Client IDs. Client ID typically ends with "*.apps.googleusercontent.com".',
          },
          { status: 400 }
        );
      }
      if (cleanClientId.length < 8) {
        return NextResponse.json(
          { error: 'Invalid Google OAuth Client ID: Format is too short.' },
          { status: 400 }
        );
      }
      SecretManager.setSecret('GOOGLE_CLIENT_ID', cleanClientId, null, 'Google OAuth Client ID');
    }

    // Preserve existing secret if new secret input is blank
    if (clientSecret && clientSecret.trim().length > 0) {
      const cleanSecret = clientSecret.trim();
      if (cleanSecret.length < 5) {
        return NextResponse.json(
          { error: 'Invalid Google OAuth Client Secret: Secret format is too short.' },
          { status: 400 }
        );
      }
      SecretManager.setSecret('GOOGLE_CLIENT_SECRET', cleanSecret, null, 'Google OAuth Client Secret');
    }

    // Validate Redirect URI if provided
    if (redirectUri && redirectUri.trim().length > 0) {
      const cleanUri = redirectUri.trim();
      try {
        new URL(cleanUri);
        SecretManager.setSecret('GOOGLE_REDIRECT_URI', cleanUri, null, 'Google OAuth Redirect URI');
      } catch {
        return NextResponse.json(
          { error: 'Invalid Authorized Redirect URI: Must be a valid HTTP or HTTPS URL.' },
          { status: 400 }
        );
      }
    }

    const rawClientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || '';
    const hasClientSecret = SecretManager.hasSecret('GOOGLE_CLIENT_SECRET');
    const isValidClientIdFormat = Boolean(rawClientId && !rawClientId.includes('@'));
    const isConfigured = isValidClientIdFormat && hasClientSecret;

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'google_sheets_oauth_updated',
      resourceType: 'integration_google_sheets',
      metadata: { enabled: Boolean(enabled), isConfigured, redirectUri },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Sheets OAuth configuration saved securely in encrypted vault.',
      isConfigured,
      statusText: isConfigured ? 'Configured' : 'Not Configured',
      maskedClientId: isValidClientIdFormat ? SecretManager.maskSecret(rawClientId) : 'NOT_CONFIGURED',
      maskedClientSecret: hasClientSecret ? SecretManager.getMaskedSecret('GOOGLE_CLIENT_SECRET') : 'NOT_CONFIGURED',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update Google Sheets settings.' },
      { status: 500 }
    );
  }
}
