/**
 * Bulk Contact Form Outreach System — Resend Email Provider Adapter
 * Handles server-side email dispatch, API key resolution via SecretManager,
 * and connection diagnostics. NEVER exposes raw API keys to client components.
 */

import { EmailProvider, SendEmailParams, EmailSendResult, EmailConnectionTestResult } from './email-provider.interface';
import { SecretManager } from '@/lib/security/secret-manager';
import { getEmailSenderConfig } from './email-config';

export class ResendProvider implements EmailProvider {
  private organizationId?: string | null;

  constructor(organizationId?: string | null) {
    this.organizationId = organizationId;
  }

  public getProviderName(): string {
    return 'Resend';
  }

  /**
   * Retrieves the secure API key exclusively on the server.
   */
  private getApiKey(): string | null {
    const raw = SecretManager.getSecret('RESEND_API_KEY', this.organizationId);
    return raw?.trim().replace(/^[\"']|[\"']$/g, '') || null;
  }

  /**
   * Tests the connection to Resend API.
   */
  public async testConnection(): Promise<EmailConnectionTestResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        connected: false,
        provider: 'Resend',
        latencyMs: Date.now() - startTime,
        message: 'Resend API Key is NOT configured. Please enter a valid key in Super Admin Integrations.',
        error: 'MISSING_API_KEY',
      };
    }

    // Check key format (Resend keys typically start with re_)
    if (!apiKey.startsWith('re_') && !apiKey.startsWith('mock_resend_') && !apiKey.startsWith('test_')) {
      return {
        connected: false,
        provider: 'Resend',
        latencyMs: Date.now() - startTime,
        message: 'Invalid Resend API Key format. Valid keys typically start with "re_".',
        error: 'INVALID_KEY_FORMAT',
      };
    }

    // In local sandbox or when offline, verify key format and simulate healthy connection
    if (apiKey.startsWith('mock_') || apiKey.startsWith('test_') || process.env.NODE_ENV === 'test') {
      return {
        connected: true,
        provider: 'Resend',
        configuredEmail: 'outreach@bulkreach.io',
        latencyMs: 42,
        message: 'Resend API connection test successful (Sandbox Mode).',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/api-keys', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok || response.status === 200) {
        return {
          connected: true,
          provider: 'Resend',
          configuredEmail: 'outreach@bulkreach.io',
          latencyMs,
          message: 'Resend API connection test successful (Production Active).',
        };
      }

      const invalidCredentials = response.status === 401 || response.status === 403;
      return {
        connected: false,
        provider: 'Resend',
        latencyMs,
        message: invalidCredentials
          ? 'Resend rejected the configured credential. Replace the API key and test again.'
          : `Resend connection validation was rejected (HTTP ${response.status}). Try again or check provider status.`,
        error: invalidCredentials ? 'INVALID_CREDENTIALS' : 'PROVIDER_REJECTED',
      };
    } catch (err: any) {
      return {
        connected: false,
        provider: 'Resend',
        latencyMs: Date.now() - startTime,
        message: 'Resend could not be reached. Check server network access and provider availability, then retry.',
        error: 'NETWORK_OR_PROVIDER_ERROR',
      };
    }
  }

  /**
   * Sends an email via Resend.
   */
  public async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    const apiKey = this.getApiKey();
    const timestamp = new Date().toISOString();

    if (!apiKey) {
      return {
        success: false,
        errorCode: 'MISSING_API_KEY',
        errorMessage: 'Cannot send email: RESEND_API_KEY is not configured.',
        timestamp,
      };
    }

    const sender = getEmailSenderConfig();
    const fromEmail = params.from || sender.fromEmail;
    const fromName = params.fromName || sender.fromName;
    const fromFormatted = `${fromName} <${fromEmail}>`;

    // Sandbox / Test Mode dispatch
    if (apiKey.startsWith('mock_') || apiKey.startsWith('test_') || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        messageId: `resend_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        statusCode: 200,
        timestamp,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromFormatted,
          to: Array.isArray(params.to) ? params.to : [params.to],
          reply_to: params.replyTo || sender.replyToEmail,
          subject: params.subject,
          html: params.html,
          text: params.text,
          headers: params.headers,
          tags: params.tags,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          success: true,
          messageId: data.id || `msg_${Date.now()}`,
          statusCode: response.status,
          timestamp,
        };
      }

      return {
        success: false,
        statusCode: response.status,
        errorCode: response.status === 401 || response.status === 403
          ? 'INVALID_CREDENTIALS'
          : 'PROVIDER_REJECTED',
        errorMessage: response.status === 401 || response.status === 403
          ? 'Resend rejected the configured credential.'
          : data.message || `Resend rejected the email request (HTTP ${response.status}).`,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        errorCode: 'NETWORK_OR_PROVIDER_ERROR',
        errorMessage: 'Unable to reach the email delivery provider.',
        timestamp,
      };
    }
  }
}
