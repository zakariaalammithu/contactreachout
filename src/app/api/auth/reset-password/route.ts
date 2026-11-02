import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';

const resetSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    code: z.string().trim().length(6, 'Enter the 6-digit reset code'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
    const rateCheck = AuthStore.checkRateLimit(`reset_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many reset attempts. Please wait ${rateCheck.remainingSeconds} seconds.` },
        { status: 429 },
      );
    }

    const parsed = resetSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid reset request.' }, { status: 400 });
    }

    const { email, code, newPassword } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // OTP expiry (2 minutes), 5-attempt cap and single-use invalidation are
    // enforced by AuthStore.verifyOtpCode; a code issued for any purpose
    // verifies here, and codes only ever exist after a forgot-password
    // request for an existing account.
    const verification = EmailVerificationService.verifyCode(cleanEmail, code);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || 'Invalid or expired reset code.' },
        { status: 400 },
      );
    }

    const user = AuthStore.getUserByEmail(cleanEmail);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset code.' }, { status: 400 });
    }

    AuthStore.resetPassword(cleanEmail, newPassword);

    // No session is created: the user signs in with the new password.
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Please sign in with your new password.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reset password.' }, { status: 500 });
  }
}
