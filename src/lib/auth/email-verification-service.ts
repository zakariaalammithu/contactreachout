import crypto from 'crypto';
import { ResendProvider } from '@/lib/services/email/resend-provider';
import { SecretManager } from '@/lib/security/secret-manager';
import { AuthStore } from './auth-store';
import { getEmailSenderConfig } from '@/lib/services/email/email-config';

export class EmailVerificationService {
  /**
   * Helper to mask email for public UI display (e.g. m***e@gmail.com)
   */
  public static maskEmail(email: string): string {
    const clean = email.trim();
    const parts = clean.split('@');
    if (parts.length !== 2) return clean;

    const [user, domain] = parts;
    if (user.length <= 2) {
      return `${user.charAt(0)}***@${domain}`;
    }
    return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
  }

  /**
   * Generates a secure 6-digit OTP code, stores its SHA-256 hash in AuthStore,
   * and dispatches a formatted verification email via ResendProvider.
   */
  public static async sendVerificationCode(params: {
    email: string;
    purpose: 'signup' | 'signin' | 'google_verify';
    resendApiKey?: string;
  }): Promise<{ success: boolean; message: string; maskedEmail: string; cooldownSeconds: number; debugCode?: string }> {
    const emailKey = params.email.toLowerCase().trim();

    // Store API key if passed explicitly
    if (params.resendApiKey && params.resendApiKey.startsWith('re_')) {
      SecretManager.setSecret('RESEND_API_KEY', params.resendApiKey);
    }

    // Check resend cooldown
    const existing = AuthStore.getOtpRecord(emailKey);
    if (existing && Date.now() < existing.resendAvailableAt) {
      const waitSec = Math.ceil((existing.resendAvailableAt - Date.now()) / 1000);
      return {
        success: false,
        message: `Please wait ${waitSec} seconds before requesting another code.`,
        maskedEmail: this.maskEmail(emailKey),
        cooldownSeconds: waitSec,
      };
    }

    // Cryptographically secure 6-digit code generation
    const plainCode = crypto.randomInt(100000, 999999).toString();

    const rawApiKey = params.resendApiKey || SecretManager.getSecret('RESEND_API_KEY') || process.env.RESEND_API_KEY;
    const apiKey = rawApiKey?.trim().replace(/^[\"']|[\"']$/g, '');
    const subject = `🔑 Verification Code: ${plainCode}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #007A55; margin-top: 0; font-size: 20px;">ContactReachout Account Verification</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          Use the 6-digit code below to complete your authentication for <strong>${this.maskEmail(emailKey)}</strong>:
        </p>
        <div style="background-color: #EDF2EF; padding: 18px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #007A55; border-radius: 12px; margin: 20px 0;">
          ${plainCode}
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.4;">
          This code is single-use and will expire in 2 minutes. If you did not request this email, please secure your account.
        </p>
      </div>
    `;

    let emailDelivered = false;
    let providerError = '';
    const sender = getEmailSenderConfig();

    // Attempt direct live fetch to Resend API if key is available
    if (apiKey && apiKey.startsWith('re_')) {
      try {
        const fetchRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${sender.fromName} <${sender.fromEmail}>`,
            reply_to: sender.replyToEmail,
            to: [emailKey],
            subject,
            html,
          }),
        });

        if (fetchRes.ok) {
          emailDelivered = true;
        } else {
          const errorData = await fetchRes.json().catch(() => ({}));
          providerError = errorData.message || `Resend status ${fetchRes.status}`;
          console.error('[Resend API Error]', fetchRes.status, providerError);
        }
      } catch (e: any) {
        providerError = e.message || 'Network error connecting to email provider.';
        console.error('Direct Resend fetch error:', e);
      }
    }

    if (!emailDelivered && !providerError) {
      // Fallback via ResendProvider adapter
      const resendProvider = new ResendProvider();
      const sendResult = await resendProvider.sendEmail({
        to: emailKey,
        subject,
        html,
      });

      emailDelivered = sendResult.success;
      if (!sendResult.success) {
        providerError = sendResult.errorMessage || '';
      }
    }

    // IF LIVE EMAIL WAS DISPATCHED SUCCESSFULLY -> COMMIT OTP & COOLDOWN
    if (emailDelivered) {
      AuthStore.saveOtpCode(emailKey, plainCode, params.purpose, 2 * 60 * 1000, 20 * 1000);

      return {
        success: true,
        message: `Verification code sent to ${this.maskEmail(emailKey)}. Check your inbox.`,
        maskedEmail: this.maskEmail(emailKey),
        cooldownSeconds: 20,
      };
    }

    // IF EMAIL DISPATCH FAILED -> CLEAN UP ANY OTP AND SET ZERO COOLDOWN
    AuthStore.clearOtpCode(emailKey);

    let userFacingError = 'Verification email could not be sent. Please check your email address or try again later.';
    if (providerError && (providerError.includes('only send testing emails') || providerError.includes('verify a domain'))) {
      userFacingError = 'Verification email could not be sent to this recipient address. (Resend testing domain restriction: Free mode sends only to account owner. Verify a custom domain in Resend for external recipients).';
    }

    return {
      success: false,
      message: userFacingError,
      maskedEmail: this.maskEmail(emailKey),
      cooldownSeconds: 0,
    };
  }

  /**
   * Verifies the user-submitted 6-digit OTP code against the server SHA-256 hash.
   */
  public static verifyCode(email: string, code: string): { valid: boolean; reason?: string } {
    return AuthStore.verifyOtpCode(email, code);
  }
}
