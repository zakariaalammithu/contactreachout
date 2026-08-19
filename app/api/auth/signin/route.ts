import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';

const signinSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  resendApiKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Rate limiting check per IP / identifier
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = AuthStore.checkRateLimit(`signin_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many sign in attempts. Please wait ${rateCheck.remainingSeconds} seconds.` },
        { status: 429 }
      );
    }

    const parsed = signinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password, resendApiKey } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify credentials against AuthStore
    const user = AuthStore.getUserByEmail(cleanEmail);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    if (user.isSuspended) {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 });
    }

    // Verify password if user has password set
    if (user.passwordHash && user.salt) {
      const isMatch = AuthStore.verifyPassword(password, user.passwordHash, user.salt);
      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
      }
    } else if (user.googleSub) {
      // User registered via Google OAuth originally
      return NextResponse.json(
        { error: 'This account was created with Google. Please click "Continue with Google" to sign in.' },
        { status: 400 }
      );
    }

    // 2. Credentials valid -> Send NEW 6-digit 2FA verification code
    const dispatchResult = await EmailVerificationService.sendVerificationCode({
      email: cleanEmail,
      purpose: 'signin',
      resendApiKey,
    });

    if (!dispatchResult.success) {
      return NextResponse.json({ error: dispatchResult.message }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      maskedEmail: dispatchResult.maskedEmail,
      message: dispatchResult.message,
      cooldownSeconds: dispatchResult.cooldownSeconds,
      debugCode: dispatchResult.debugCode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An error occurred during sign in.' },
      { status: 500 }
    );
  }
}
