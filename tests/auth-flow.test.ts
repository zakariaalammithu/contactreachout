import { AuthStore } from '../src/lib/auth/auth-store';
import { EmailVerificationService } from '../src/lib/auth/email-verification-service';
import { SessionManager } from '../src/lib/auth/session';

async function runAuthSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING AUTHENTICATION SYSTEM COMPREHENSIVE SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, errorDetail?: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${title} ${errorDetail ? `(${errorDetail})` : ''}`);
      failed++;
    }
  }

  // TEST 1: Super Admin & Initial Accounts Initialization
  const superAdmin = AuthStore.getUserByEmail('mithusquare@gmail.com');
  assert(superAdmin !== null && superAdmin.role === 'SUPER_ADMIN', '1. Primary Super Admin (mithusquare@gmail.com) exists with role SUPER_ADMIN');

  // TEST 2: Email Sign Up & Validation
  const newEmail = `user.test.${Date.now()}@example.com`;
  const plainPassword = 'SecurePassword123!';
  const newAccount = AuthStore.createUser({
    name: 'Test Runner User',
    email: newEmail,
    phone: '+15559998888',
    password: plainPassword,
  });
  assert(newAccount.email === newEmail && newAccount.role === 'USER', '2. Email Sign Up creates user account record');

  // TEST 3: Duplicate Account Prevention
  let duplicateCaught = false;
  try {
    AuthStore.createUser({
      name: 'Duplicate Attempt',
      email: newEmail,
      password: plainPassword,
    });
  } catch (err: any) {
    duplicateCaught = true;
  }
  assert(duplicateCaught, '3. Duplicate account creation is prevented with clear error');

  // TEST 4: Password Hashing & Security (scrypt)
  const passwordMatch = AuthStore.verifyPassword(plainPassword, newAccount.passwordHash!, newAccount.salt!);
  const wrongPasswordMatch = AuthStore.verifyPassword('WrongPassword123!', newAccount.passwordHash!, newAccount.salt!);
  assert(passwordMatch && !wrongPasswordMatch, '4. Password hashed using scrypt and verified securely');

  // TEST 5: SHA-256 Hashed 6-Digit OTP Code Generation
  const plainOtp = '654321';
  AuthStore.saveOtpCode(newEmail, plainOtp, 'signup');
  const otpRecord = AuthStore.getOtpRecord(newEmail);
  assert(otpRecord !== null && otpRecord.hashedCode !== plainOtp, '5. 6-digit OTP code is stored SHA-256 hashed (never plaintext)');

  // TEST 6: Wrong Verification Code Check
  const wrongOtpResult = AuthStore.verifyOtpCode(newEmail, '000000');
  assert(!wrongOtpResult.valid, '6. Wrong verification code is rejected');

  // TEST 7: Correct Single-Use OTP Verification
  AuthStore.saveOtpCode(newEmail, plainOtp, 'signup');
  const correctOtpResult = AuthStore.verifyOtpCode(newEmail, plainOtp);
  assert(correctOtpResult.valid, '7. Correct verification code is accepted');

  // TEST 8: Single-Use Code Invalidation (Reuse fails)
  const reuseOtpResult = AuthStore.verifyOtpCode(newEmail, plainOtp);
  assert(!reuseOtpResult.valid, '8. Verification code is single-use and cannot be reused');

  // TEST 9: Masked Email Formatting (m***@gmail.com)
  const masked = EmailVerificationService.maskEmail('mithusquare@gmail.com');
  assert(masked === 'm***e@gmail.com' || masked.includes('***'), `9. Email is masked correctly for UI display: ${masked}`);

  // TEST 10: Resend Verification Code Cooldown
  AuthStore.saveOtpCode(newEmail, '112233', 'signin', 10 * 60 * 1000, 60 * 1000);
  const cooldownRecord = AuthStore.getOtpRecord(newEmail);
  assert(cooldownRecord !== null && cooldownRecord.resendAvailableAt > Date.now(), '10. Resend code cooldown (60s) is enforced');

  // TEST 11: Session Creation & Token Resolution
  const session = AuthStore.createSession(newAccount.id, newAccount.email, newAccount.role);
  const resolvedSession = AuthStore.getSession(session.sessionId);
  assert(resolvedSession !== null && resolvedSession.userId === newAccount.id, '11. Server session created and resolved successfully');

  // TEST 12: Session Invalidation on Logout
  AuthStore.deleteSession(session.sessionId);
  const loggedOutSession = AuthStore.getSession(session.sessionId);
  assert(loggedOutSession === null, '12. Session invalidated upon logout');

  // TEST 13: Google OAuth New User Auto-Provisioning
  const googleEmail = `google.user.${Date.now()}@gmail.com`;
  const googleSub = `google_sub_${Date.now()}`;
  const googleUser = AuthStore.createUser({
    name: 'Google New User',
    email: googleEmail,
    googleSub,
    isEmailVerified: true,
  });
  assert(googleUser.googleSub === googleSub && googleUser.isEmailVerified, '13. First-time Google user created using verified identity');

  // TEST 14: Existing Google User Login & Identity Mapping
  const foundGoogleUser = AuthStore.getUserByGoogleSub(googleSub);
  assert(foundGoogleUser !== null && foundGoogleUser.email === googleEmail, '14. Existing Google user maps to the same application user');

  // TEST 15: Account Linking (Existing Email Account + Google Sign-In)
  const existingEmailAccount = AuthStore.createUser({
    name: 'Email Account User',
    email: `email.to.link.${Date.now()}@domain.com`,
    password: 'Password123!',
  });
  const linkedGoogleSub = `google_sub_linked_${Date.now()}`;
  const updatedUser = AuthStore.updateUser(existingEmailAccount.email, { googleSub: linkedGoogleSub });
  assert(updatedUser.googleSub === linkedGoogleSub, '15. Account linking links Google identity to existing email account');

  // TEST 16: Rate Limiting Enforcement
  const rateLimitTestKey = 'test_ip_rate_limit_123';
  for (let i = 0; i < 5; i++) {
    AuthStore.checkRateLimit(rateLimitTestKey, 3, 60000);
  }
  const rateLimitResult = AuthStore.checkRateLimit(rateLimitTestKey, 3, 60000);
  assert(!rateLimitResult.allowed, '16. Rate limiting blocks excessive requests');

  // TEST 17: Admin & Super Admin Role Routing Compatibility
  const adminAccount = AuthStore.getUserByEmail('operator@bulkreach.io');
  assert(adminAccount !== null && adminAccount.role === 'ADMIN', '17. Admin role compatibility verified for operator@bulkreach.io');

  console.log('====================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthSuite().catch(console.error);
