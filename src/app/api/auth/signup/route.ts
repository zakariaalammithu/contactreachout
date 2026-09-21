import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';
import { RiskEngine } from '@/lib/auth/risk-engine';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  resendApiKey: z.string().optional(),
  referralCode: z.string().trim().max(20).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
    const userAgent = req.headers.get('user-agent');

    // 1. Rate limiting check
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

    const { fullName, email, phone, password, resendApiKey, referralCode } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // 3. Multi-Signal Risk Engine & Anti-Abuse Check
    const riskEval = RiskEngine.evaluateSignupRequest({
      ip,
      userAgent,
      email: cleanEmail,
    });

    if (!riskEval.allowed) {
      return NextResponse.json(
        { error: riskEval.reasons[0] || 'Account creation request flagged by anti-abuse protection.' },
        { status: 400 }
      );
    }

    // 4. Check if email already exists
    const existingUser = AuthStore.getUserByEmail(cleanEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please Sign In instead.' },
        { status: 409 }
      );
    }

    // Store pending registration details securely
    if (referralCode && !AuthStore.getUserByReferralCode(referralCode)) {
      return NextResponse.json({ error: 'This referral code is not valid.' }, { status: 400 });
    }
    AuthStore.savePendingSignup({ fullName, email: cleanEmail, phone, password, referralCode });

    // 5. Send 6-digit verification code
    const dispatchResult = await EmailVerificationService.sendVerificationCode({
      email: cleanEmail,
      purpose: 'signup',
      resendApiKey,
    });

    if (!dispatchResult.success) {
      return NextResponse.json({ error: dispatchResult.message }, { status: 429 });
    }

    // Record signup signal velocity
    RiskEngine.recordSuccessfulSignup(ip, userAgent);

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
