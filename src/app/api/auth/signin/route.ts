
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';
import { SessionManager } from '@/lib/auth/session';
import { ensureUserInRegistry, fetchDurableAuth } from '@/lib/services/durable-users';

const signinSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  resendApiKey: z.string().optional(),
  next: z.string().optional(),
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

    const { email, password, resendApiKey, next } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify credentials against AuthStore. The record may live only
    // as a durable row (created by signup on another instance, or lost
    // in a recycle): materialize it — with its stored password hash
    // when one was saved — before answering "Invalid email or password."
    let user = AuthStore.getUserByEmail(cleanEmail);
    if (!user) {
      await ensureUserInRegistry(cleanEmail);
      user = AuthStore.getUserByEmail(cleanEmail);
    }
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    if (user.isSuspended) {
      return NextResponse.json({ error: 'Your account is suspended. Please contact support.' }, { status: 403 });
    }

    // Verify password if user has password set
    if (user.passwordHash && user.salt) {
      let isMatch = AuthStore.verifyPassword(password, user.passwordHash, user.salt);
      if (!isMatch) {
        // Stale local record (password reset on another instance): the
        // durable hash is the current credential — a password that
        // verifies against it heals this record and signs the user in.
        const durableAuth = await fetchDurableAuth(cleanEmail);
        if (
          durableAuth
          && (durableAuth.passwordHash !== user.passwordHash || durableAuth.passwordSalt !== user.salt)
          && AuthStore.verifyPassword(password, durableAuth.passwordHash, durableAuth.passwordSalt)
        ) {
          AuthStore.updateUser(cleanEmail, {
            passwordHash: durableAuth.passwordHash,
            salt: durableAuth.passwordSalt,
          });
          isMatch = true;
        }
      }
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

    // Verified accounts sign in directly. Email verification is a one-time
    // account-creation step, not a second factor on every login.
    if (user.isEmailVerified) {
      const session = AuthStore.createSession(user.id, user.email, user.role);
      const isAdminRole = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      const requestedNext = next?.startsWith('/') && !next.startsWith('//') && (!next.startsWith('/admin') || isAdminRole) ? next : undefined;
      const redirectTo = requestedNext || (isAdminRole ? '/admin' : '/campaigns');
      const response = NextResponse.json({
        success: true,
        authenticated: true,
        redirectTo,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
      SessionManager.setSessionCookie(response, session);
      return response;
    }


    // An existing but unverified account must finish its one-time verification.
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
      verificationRequired: true,
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
