/**
 * Bulk Contact Form Outreach System — Email Provider Interface
 * Abstraction layer for transactional and notification email dispatch (Resend, SendGrid, SMTP).
 */

export interface SendEmailParams {
  to: string | string[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  statusCode?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface EmailConnectionTestResult {
  connected: boolean;
  provider: string;
  configuredEmail?: string;
  latencyMs: number;
  message: string;
  error?: string;
}

export interface EmailProvider {
  getProviderName(): string;
  testConnection(): Promise<EmailConnectionTestResult>;
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>;
}
