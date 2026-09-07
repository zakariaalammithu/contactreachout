export interface EmailSenderConfig {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
}

export function getEmailSenderConfig(): EmailSenderConfig {
  return {
    fromEmail: process.env.RESEND_FROM_EMAIL || 'auth@contactreachout.com',
    fromName: process.env.RESEND_FROM_NAME || 'ContactReachout',
    replyToEmail: process.env.RESEND_REPLY_TO || 'hello@contactreachout.com',
  };
}
