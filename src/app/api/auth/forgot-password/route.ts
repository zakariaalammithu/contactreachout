import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Generic message used for EVERY outcome: the response must never reveal
// whether an account exists for the email.
const GENERIC_MESSAGE =
  'If an account exists for this email, a password reset code has been sent. Codes expire in 2 minutes.';

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
    const rateCheck = AuthStore.checkRateLimit(`forgot_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many reset attempts. Please wait ${rateCheck.remainingSeconds} seconds.` },
        { status: 429 },
      );
    }

    const parsed = forgotSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid email.' }, { status: 400 });
    }

    const cleanEmail = parsed.data.email.toLowerCase().trim();
    const user = AuthStore.getUserByEmail(cleanEmail);

    if (user) {
      // Reuses the existing email OTP service (2-minute expiry, resend
      // cooldown, single-use codes). The service has no dedicated reset
      // purpose, so the code is issued under the generic 'signin' purpose;
      // verification itself is purpose-agnostic (see reset-password).
      const result = await EmailVerificationService.sendVerificationCode({
        email: cleanEmail,
        purpose: 'signin',
      });
      if (!result.success) {
        // Deliberately still generic: a send failure must not leak that
        // the account exists.
        console.error('[forgot-password] reset code dispatch failed.', { email: cleanEmail });
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to request password reset.' }, { status: 500 });
  }
}
