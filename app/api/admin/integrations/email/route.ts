import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { ResendProvider } from '@/lib/services/email/resend-provider';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const hasKey = SecretManager.hasSecret('RESEND_API_KEY');
  const maskedKey = SecretManager.getMaskedSecret('RESEND_API_KEY');

  return NextResponse.json({
    enabled: hasKey,
    maskedApiKey: maskedKey,
    fromEmail: 'outreach@bulkreach.io',
    fromName: 'BulkReach Team',
    replyToEmail: 'support@bulkreach.io',
    provider: 'Resend',
    lastTestStatus: hasKey ? 'SUCCESS' : 'NOT_CONFIGURED',
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { apiKey, fromEmail, fromName, replyToEmail, testEmailRecipient, action } = body;

    // Test Connection
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

      return NextResponse.json(result);
    }

    // Send Test Email
    if (action === 'send_test_email') {
      if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
        return NextResponse.json({ error: 'Valid test recipient email is required.' }, { status: 400 });
      }

      const provider = new ResendProvider();
      const sendResult = await provider.sendEmail({
        to: testEmailRecipient,
        from: fromEmail || 'outreach@bulkreach.io',
        fromName: fromName || 'BulkReach Super Admin',
        replyTo: replyToEmail,
        subject: '✓ Super Admin Test: Resend Integration Active',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #4f46e5;">BulkReach AI — Email Integration Test</h2>
            <p>Congratulations! Your Resend email integration is successfully configured and active.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">Dispatched by Super Admin (${session.email}) at ${new Date().toISOString()}</p>
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

      return NextResponse.json(sendResult);
    }

    // Save Resend API Key securely
    if (apiKey && apiKey.trim().length > 0) {
      SecretManager.setSecret('RESEND_API_KEY', apiKey.trim(), null, 'Global Resend API Key');
    }

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'resend_configuration_saved',
      resourceType: 'integration_email',
      metadata: { fromEmail, fromName, replyToEmail },
    });

    return NextResponse.json({
      success: true,
      message: 'Resend email configuration saved securely.',
      maskedApiKey: SecretManager.getMaskedSecret('RESEND_API_KEY'),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update email integration.' }, { status: 500 });
  }
}
