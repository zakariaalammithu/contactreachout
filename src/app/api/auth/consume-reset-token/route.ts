import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';

const consumeSchema = z
  .object({
    token: z.string().trim().min(1, 'Reset link is missing or invalid'),
    newPassword: z.string().min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string().min(12, 'Confirm password must be at least 12 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Consumes an admin-issued password-reset link token (single-use, 1h).
 * Errors never distinguish unknown vs expired vs already-used tokens.
 * No session is created: the user signs in with the new password.
 */
export async function POST(req: Request) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
    const rateCheck = AuthStore.checkRateLimit(`consume-reset_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many reset attempts. Please wait ${rateCheck.remainingSeconds} seconds.` },
        { status: 429 },
      );
    }

    const parsed = consumeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid reset request.' },
        { status: 400 },
      );
    }

    const email = AuthStore.consumeResetToken(parsed.data.token, parsed.data.newPassword);
    if (!email) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Ask an admin to issue a new one.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Please sign in with your new password.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset password.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
