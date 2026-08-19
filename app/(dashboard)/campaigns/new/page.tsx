import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';

const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate fields
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, code } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // 2. Verify code
    const verification = EmailVerificationService.verifyCode(cleanEmail, code, 'signup');
    if (!verification.success) {
      return NextResponse.json({ error: verification.message }, { status: 400 });
    }

    // Create user profile
    const newUser = AuthStore.createUser({
      fullName: 'New Outreach Member',
      email: cleanEmail,
      passwordHash: 'hashed_password_placeholder',
    });

    // Generate JWT token
    const token = AuthStore.createAuthToken(newUser);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        plan: newUser.plan,
      },
      token,
      message: 'Account verified successfully!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}
