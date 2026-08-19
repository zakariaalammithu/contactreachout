import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  resendApiKey: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Cache pending signup registration details until OTP verification
const pendingSignups = new Map<string, { fullName: string; email: string; phone?: string; password: string }>();

function getPendingSignup(email: string) {
  return pendingSignups.get(email.toLowerCase().trim()) || null;
}

function clearPendingSignup(email: string) {
  pendingSignups.delete(email.toLowerCase().trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Rate limiting check
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = AuthStore.checkRateLimit(`signup_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many signup attempts. Please wait ${rateCheck.remainingSeconds} seconds.` },
        { status: 429 }
      );
    }

    // 2. Validate fields
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json({ error: firstIssue.message }, { status: 400 });
    }

    const { fullName, email, phone, password, resendApiKey } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // 3. Check if email already exists
    const existingUser = AuthStore.getUserByEmail(cleanEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please Sign In instead.' },
        { status: 409 }
      );
    }

    // Store pending registration details securely
    pendingSignups.set(cleanEmail, { fullName, email: cleanEmail, phone, password });

    // 4. Send 6-digit verification code
    const dispatchResult = await EmailVerificationService.sendVerificationCode({
      email: cleanEmail,
      purpose: 'signup',
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
      { error: err.message || 'An error occurred during account creation.' },
      { status: 500 }
    );
  }
}
