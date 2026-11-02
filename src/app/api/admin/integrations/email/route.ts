import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { ResendProvider } from '@/lib/services/email/resend-provider';
import { AuditLogService } from '@/lib/services/audit-log-service';
import { getEmailSenderConfig } from '@/lib/services/email/email-config';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const info = SecretManager.getSecretInfo('RESEND_API_KEY');
    const sender = getEmailSenderConfig();

    return NextResponse.json({
      success: true,
      enabled: info.configured,
      maskedApiKey: info.maskedPreview,
      source: info.source,
      sourceText: info.sourceText,
      isOverrideActive: info.isOverrideActive,
      fromEmail: sender.fromEmail,
      fromName: sender.fromName,
      replyToEmail: sender.replyToEmail,
      provider: 'Resend',
      connected: false,
      lastTestStatus: info.configured ? 'CONFIGURED_UNVERIFIED' : 'NOT_CONFIGURED',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve email integration config.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { apiKey, fromEmail, fromName, replyToEmail, testEmailRecipient, action } = body;
    const currentSender = getEmailSenderConfig();

    // 0. Action: Clear Override — DISABLED under environment-only mode
    // (2026-11-02): dashboard key editing is removed; keys come only
    // from server environment.
    if (action === 'clear_override') {
      return NextResponse.json(
        { error: 'API keys are managed via server environment only. Set or remove this value in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
        { status: 410 },
      );
    }

    // 1. Action: Test Connection
    if (action === 'test_connection') {
      const provider = new ResendProvider();
      const result = await provider.testConnection();

      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'email_connection_tested',
        resourceType: 'integration_email',
        status: result.connected ? 'success' : 'failed',
        metadata: { provider: 'Resend', latencyMs: result.latencyMs, message: result.message },
      });

      const status = result.connected
        ? 200
        : result.error === 'MISSING_API_KEY' || result.error === 'INVALID_KEY_FORMAT'
          ? 400
          : result.error === 'INVALID_CREDENTIALS'
            ? 424
            : 503;

      return NextResponse.json({
        success: result.connected,
        connected: result.connected,
        message: result.message,
        latencyMs: result.latencyMs,
        provider: result.provider,
        error: result.error,
      }, { status });
    }

    // 2. Action: Send Test Email
    if (action === 'send_test_email') {
      if (!testEmailRecipient || !EMAIL_REGEX.test(testEmailRecipient.trim())) {
        return NextResponse.json(
          { error: 'Valid test recipient email address is required (e.g., name@domain.com).' },
          { status: 400 }
        );
      }

      const effectiveFrom = (fromEmail || currentSender.fromEmail || '').trim();
      const effectiveReplyTo = (replyToEmail || currentSender.replyToEmail || '').trim();

      if (!EMAIL_REGEX.test(effectiveFrom)) {
        return NextResponse.json(
          { error: `Invalid Default From Email format: "${effectiveFrom}".` },
          { status: 400 }
        );
      }

      if (effectiveReplyTo && !EMAIL_REGEX.test(effectiveReplyTo)) {
        return NextResponse.json(
          { error: `Invalid Reply-To Email format: "${effectiveReplyTo}".` },
          { status: 400 }
        );
      }

      const provider = new ResendProvider();
      const sendResult = await provider.sendEmail({
        to: testEmailRecipient.trim(),
        from: effectiveFrom,
        fromName: (fromName || currentSender.fromName || 'ContactReachout').trim(),
        replyTo: effectiveReplyTo,
        subject: '✓ Admin Diagnostics: Resend Integration Test Email',
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded-radius: 12px; background-color: #ffffff; color: #111827;">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <h2 style="color: #0e6de4; font-weight: 800; font-size: 20px; margin: 0;">ContactReachout — Email Integration Test</h2>
            </div>
            <p style="font-size: 14px; line-height: 1.6; color: #374151;">
              This test message confirms that your <strong>Resend API integration</strong> and server-side email dispatch engine are active and working properly.
            </p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0e6de4; padding: 12px 16px; margin: 20px 0; border-radius: 6px; font-size: 13px; color: #4b5563;">
              <p style="margin: 0 0 4px 0;"><strong>Sender:</strong> ${effectiveFrom}</p>
              <p style="margin: 0 0 4px 0;"><strong>Recipient:</strong> ${testEmailRecipient.trim()}</p>
              <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">Dispatched via Secure Admin Diagnostics • ContactReachout Engine</p>
          </div>
        `,
      });

      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'test_email_dispatched',
        resourceType: 'integration_email',
        status: sendResult.success ? 'success' : 'failed',
        metadata: { recipient: testEmailRecipient, messageId: sendResult.messageId },
      });

      return NextResponse.json({
        success: sendResult.success,
        messageId: sendResult.messageId,
        errorMessage: sendResult.errorMessage,
        statusCode: sendResult.statusCode,
      });
    }

    // 3. Action: Save Resend Configuration — DISABLED under
    // environment-only mode (2026-11-02). RESEND_API_KEY and the sender
    // identity (RESEND_FROM_EMAIL / RESEND_FROM_NAME / RESEND_REPLY_TO)
    // come only from server environment now; dashboard writes used to
    // land in per-instance memory and vanish on recycle.
    return NextResponse.json(
      { error: 'API keys are managed via server environment only. Set RESEND_API_KEY and sender values in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
      { status: 410 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update Resend integration settings.' },
      { status: 500 }
    );
  }
}
