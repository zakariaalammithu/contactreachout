import { NextResponse } from 'next/server';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, purpose, resendApiKey } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const result = await EmailVerificationService.sendVerificationCode({
      email,
      purpose: purpose || 'signin',
      resendApiKey,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      maskedEmail: result.maskedEmail,
      message: result.message,
      cooldownSeconds: result.cooldownSeconds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resend verification code' }, { status: 500 });
  }
}
