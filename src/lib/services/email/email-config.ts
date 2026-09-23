import { SecretManager } from '@/lib/security/secret-manager';

export interface EmailSenderConfig {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
}

export function getEmailSenderConfig(): EmailSenderConfig {
  const fromEmail = SecretManager.getSecret('RESEND_FROM_EMAIL') || process.env.RESEND_FROM_EMAIL || 'auth@contactreachout.com';
  const fromName = SecretManager.getSecret('RESEND_FROM_NAME') || process.env.RESEND_FROM_NAME || 'ContactReachout';
  const replyToEmail = SecretManager.getSecret('RESEND_REPLY_TO') || process.env.RESEND_REPLY_TO || 'hello@contactreachout.com';

  return {
    fromEmail,
    fromName,
    replyToEmail,
  };
}
