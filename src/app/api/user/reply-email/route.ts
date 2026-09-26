import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = SessionManager.getSessionFromRequest(req);
  let userEmail = session?.email ? session.email.toLowerCase().trim() : '';

  if (!userEmail) {
    userEmail = (req.headers.get('x-account-email') || req.nextUrl.searchParams.get('email') || '').toLowerCase().trim();
  }

  if (!userEmail) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let user = AuthStore.getUserByEmail(userEmail);
  if (!user) {
    user = AuthStore.createUser({
      name: userEmail.split('@')[0],
      email: userEmail,
      isEmailVerified: true,
      role: 'USER',
    });
  }

  const activeReplyEmail = user.replyEmail || user.email;
  const isVerified = user.replyEmailVerified ?? user.isEmailVerified;

  return NextResponse.json({
    success: true,
    replyEmail: activeReplyEmail,
    replyEmailVerified: isVerified,
    unverifiedReplyEmail: user.unverifiedReplyEmail || '',
    accountEmail: user.email,
  });
}

export async function POST(req: NextRequest) {
  const session = SessionManager.getSessionFromRequest(req);
  let userEmail = session?.email ? session.email.toLowerCase().trim() : '';

  if (!userEmail) {
    userEmail = (req.headers.get('x-account-email') || req.nextUrl.searchParams.get('email') || '').toLowerCase().trim();
  }

  if (!userEmail) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let user = AuthStore.getUserByEmail(userEmail);
  if (!user) {
    user = AuthStore.createUser({
      name: userEmail.split('@')[0],
      email: userEmail,
      isEmailVerified: true,
      role: 'USER',
    });
  }

  try {
    const body = await req.json();
    const { action, newReplyEmail, otpCode } = body;

    const targetEmail = (newReplyEmail || '').toLowerCase().trim();

    if (action === 'send_otp') {
      if (!targetEmail || !targetEmail.includes('@')) {
        return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
      }

      // If user is restoring to their own verified account email, verify immediately
      if (targetEmail === user.email.toLowerCase().trim() && user.isEmailVerified) {
        AuthStore.updateUser(user.email, {
          replyEmail: targetEmail,
          replyEmailVerified: true,
          unverifiedReplyEmail: undefined,
        });
        return NextResponse.json({
          success: true,
          immediateVerified: true,
          message: `Reply email set to your verified account email (${targetEmail}).`,
          replyEmail: targetEmail,
        });
      }

      // Store pending unverified email and send verification OTP code
      AuthStore.updateUser(user.email, {
        unverifiedReplyEmail: targetEmail,
      });

      const result = await EmailVerificationService.sendVerificationCode({
        email: targetEmail,
        purpose: 'google_verify',
      });

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 429 });
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        maskedEmail: result.maskedEmail,
        cooldownSeconds: result.cooldownSeconds,
        unverifiedReplyEmail: targetEmail,
        debugCode: result.debugCode,
      });
    }

    if (action === 'verify_otp') {
      if (!targetEmail || !otpCode) {
        return NextResponse.json(
          { error: 'Missing target email or 6-digit verification code.' },
          { status: 400 }
        );
      }

      const verifyResult = EmailVerificationService.verifyCode(targetEmail, otpCode);
      if (!verifyResult.valid) {
        return NextResponse.json(
          { error: verifyResult.reason || 'Invalid verification code.' },
          { status: 400 }
        );
      }

      // Promote to active verified reply email
      const updatedUser = AuthStore.updateUser(user.email, {
        replyEmail: targetEmail,
        replyEmailVerified: true,
        unverifiedReplyEmail: undefined,
      });

      return NextResponse.json({
        success: true,
        message: `✓ Reply Email verified successfully! Set to ${targetEmail}.`,
        replyEmail: updatedUser.replyEmail,
        replyEmailVerified: true,
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process reply email request.' },
      { status: 500 }
    );
  }
}
