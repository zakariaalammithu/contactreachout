import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { getEmailSenderConfig } from '@/lib/services/email/email-config';

export const dynamic = 'force-dynamic';

/**
 * Read-only Resend sending-domain status for the admin email page.
 * Lists the domains registered on the Resend account (name + status) and
 * the app's effective sender. This is NOT proof of DNS correctness: SPF,
 * DKIM, and DMARC records live in DNS and must be confirmed in the
 * Resend dashboard + DNS host, and delivered headers must be inspected
 * on a real test mail. The API key itself is never returned.
 */
export async function GET(request: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const sender = getEmailSenderConfig();
  const apiKey = SecretManager.getSecret('RESEND_API_KEY');
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      sender,
      domains: [],
      error: 'RESEND_API_KEY is not configured.',
    });
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        sender,
        domains: [],
        error: 'Resend domains could not be listed. Check the API key and retry.',
      });
    }
    return NextResponse.json({
      configured: true,
      sender,
      domains: (Array.isArray(data.data) ? data.data : []).map((d: any) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        region: d.region || null,
        createdAt: d.created_at || null,
      })),
    });
  } catch {
    return NextResponse.json({
      configured: true,
      sender,
      domains: [],
      error: 'Resend could not be reached. Check network access and retry.',
    });
  }
}
