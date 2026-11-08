import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';
import { readDurableContact, writeDurableContact } from '@/lib/services/profile-contact-service';

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

  const durable = await readDurableContact(userEmail);
  const activeReplyEmail = user.replyEmail || durable?.replyEmail || user.email;
  // Both durable write paths below only store verified emails (an
  // immediate restore to the user's own verified account email, or an
  // OTP-verified promotion), so a durable value counts as verified.
  const isVerified = user.replyEmailVerified ?? (durable?.replyEmail ? true : user.isEmailVerified);

  return NextResponse.json({
    success: true,
    replyEmail: activeReplyEmail,
    replyEmailVerified: isVerified,
    unverifiedReplyEmail: user.unverifiedReplyEmail || '',
    accountEmail: user.email,
    plan: user.plan || 'Free',
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

    const normalizedPlan = String(user.plan || 'Free').trim().toLowerCase();
    const isFreePlan = !normalizedPlan || ['free', 'plan_free', 'none'].includes(normalizedPlan);
    if (isFreePlan && (action === 'send_otp' || action === 'verify_otp')) {
      return NextResponse.json(
        {
          error: 'Changing Reply Email is available on paid plans. Please upgrade to continue.',
          code: 'PAID_PLAN_REQUIRED',
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    const targetEmail = (newReplyEmail || '').toLowerCase().trim();

    if (action === 'send_otp') {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!targetEmail || !emailRegex.test(targetEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
      }

      // If user is restoring to their own verified account email, verify immediately
      if (targetEmail === user.email.toLowerCase().trim() && user.isEmailVerified) {
        AuthStore.updateUser(user.email, {
          replyEmail: targetEmail,
          replyEmailVerified: true,
          unverifiedReplyEmail: undefined,
        });
        // Durable write (best-effort; no-op until the identity migration
        // is applied). Only verified values ever go durable.
        await writeDurableContact(user.id, user.email, { replyEmail: targetEmail });
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
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        maskedEmail: result.maskedEmail,
        cooldownSeconds: result.cooldownSeconds,
        unverifiedReplyEmail: targetEmail,
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
      // Durable write (best-effort; no-op until the identity migration
      // is applied). Only OTP-verified values ever go durable.
      await writeDurableContact(user.id, user.email, { replyEmail: targetEmail });

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
