import { NextResponse } from 'next/server';
import { AuthStore } from '@/lib/auth/auth-store';
import { EmailVerificationService } from '@/lib/auth/email-verification-service';
import { SessionManager } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code || code.trim().length !== 6) {
      return NextResponse.json({ error: 'Email and valid 6-digit code are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify OTP code against server SHA-256 hash
    const verification = EmailVerificationService.verifyCode(cleanEmail, code);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason || 'Invalid verification code.' }, { status: 400 });
    }

    // 2. Resolve or create user account
    let user = AuthStore.getUserByEmail(cleanEmail);

    if (!user) {
      // First-time direct creation
      user = AuthStore.createUser({
        name: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '),
        email: cleanEmail,
        isEmailVerified: true,
      });
    } else {
      // Existing user -> Mark email verified if not already
      if (!user.isEmailVerified) {
        user = AuthStore.updateUser(cleanEmail, { isEmailVerified: true });
      }
    }

    // 3. Create server session
    const session = AuthStore.createSession(user.id, user.email, user.role);

    // Determine redirect destination based on RBAC role
    const redirectTo = (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? '/admin' : '/dashboard';

    // 4. Set HTTP-only session cookie
    const res = NextResponse.json({
      success: true,
      verified: true,
      message: 'Authentication successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      redirectTo,
    });

    SessionManager.setSessionCookie(res, session);
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to verify verification code.' }, { status: 500 });
  }
}
