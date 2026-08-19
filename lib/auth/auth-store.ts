import crypto from 'crypto';
import { AppRole } from './admin-auth-guard';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  salt?: string;
  googleSub?: string;
  avatarUrl?: string;
  role: AppRole;
  isEmailVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OtpRecord {
  email: string;
  hashedCode: string;
  expiresAt: number;
  attempts: number;
  purpose: 'signup' | 'signin' | 'google_verify';
  resendAvailableAt: number;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  email: string;
  role: AppRole;
  expiresAt: number;
}

// In-memory server-side persistent data stores
const userRegistry = new Map<string, UserAccount>();
const otpRegistry = new Map<string, OtpRecord>();
const sessionRegistry = new Map<string, UserSession>();
const rateLimitTracker = new Map<string, { count: number; windowExpiresAt: number }>();

export class AuthStore {
  public static readonly PRIMARY_SUPER_ADMIN_EMAIL = 'mithusquare@gmail.com';

  /**
   * Initializes default system accounts (Super Admin & Demo Accounts)
   */
  public static initialize(): void {
    if (!userRegistry.has(this.PRIMARY_SUPER_ADMIN_EMAIL)) {
      const { hash, salt } = this.hashPassword(process.env.INITIAL_ADMIN_PASSWORD || 'SuperAdmin#2026!');
      userRegistry.set(this.PRIMARY_SUPER_ADMIN_EMAIL, {
        id: 'usr-superadmin-001',
        name: 'Zakaria Alam Mithu',
        email: this.PRIMARY_SUPER_ADMIN_EMAIL,
        phone: '+8801700000000',
        passwordHash: hash,
        salt,
        role: 'SUPER_ADMIN',
        isEmailVerified: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!userRegistry.has('operator@bulkreach.io')) {
      const { hash, salt } = this.hashPassword('OperatorPass123!');
      userRegistry.set('operator@bulkreach.io', {
        id: 'usr-admin-002',
        name: 'System Operator',
        email: 'operator@bulkreach.io',
        phone: '+15550001111',
        passwordHash: hash,
        salt,
        role: 'ADMIN',
        isEmailVerified: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (!userRegistry.has('user@demo.com')) {
      const { hash, salt } = this.hashPassword('DemoUser123!');
      userRegistry.set('user@demo.com', {
        id: 'usr-user-003',
        name: 'Demo Customer',
        email: 'user@demo.com',
        phone: '+15552223333',
        passwordHash: hash,
        salt,
        role: 'USER',
        isEmailVerified: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // --- PASSWORD SECURITY ---
  public static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculated, 'hex'));
    } catch {
      return false;
    }
  }

  // --- OTP CODE SECURITY (SHA-256 HASHED) ---
  public static hashOtpCode(code: string): string {
    return crypto.createHash('sha256').update(code.trim()).digest('hex');
  }

  public static saveOtpCode(
    email: string,
    plainCode: string,
    purpose: 'signup' | 'signin' | 'google_verify',
    ttlMs: number = 10 * 60 * 1000, // 10 mins
    cooldownMs: number = 60 * 1000 // 60 seconds resend cooldown
  ): void {
    const key = email.toLowerCase().trim();
    const hashedCode = this.hashOtpCode(plainCode);
    const now = Date.now();

    otpRegistry.set(key, {
      email: key,
      hashedCode,
      expiresAt: now + ttlMs,
      attempts: 0,
      purpose,
      resendAvailableAt: now + cooldownMs,
    });
  }

  public static getOtpRecord(email: string): OtpRecord | null {
    const key = email.toLowerCase().trim();
    const record = otpRegistry.get(key);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      otpRegistry.delete(key);
      return null;
    }
    return record;
  }

  public static verifyOtpCode(email: string, plainCode: string): { valid: boolean; reason?: string } {
    const key = email.toLowerCase().trim();
    const record = this.getOtpRecord(key);

    if (!record) {
      return { valid: false, reason: 'Verification code has expired or was not requested.' };
    }

    if (record.attempts >= 5) {
      otpRegistry.delete(key);
      return { valid: false, reason: 'Too many failed attempts. Please request a new verification code.' };
    }

    record.attempts += 1;

    const inputHash = this.hashOtpCode(plainCode);
    const isValid = crypto.timingSafeEqual(Buffer.from(record.hashedCode, 'hex'), Buffer.from(inputHash, 'hex'));

    if (isValid) {
      // Single-use code invalidation
      otpRegistry.delete(key);
      return { valid: true };
    }

    return { valid: false, reason: 'Invalid verification code.' };
  }

  // --- USER ACCOUNT MANAGEMENT ---
  public static getUserByEmail(email: string): UserAccount | null {
    this.initialize();
    return userRegistry.get(email.toLowerCase().trim()) || null;
  }

  public static getUserByGoogleSub(googleSub: string): UserAccount | null {
    this.initialize();
    const users = Array.from(userRegistry.values());
    for (const user of users) {
      if (user.googleSub === googleSub) return user;
    }
    return null;
  }

  public static createUser(params: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    googleSub?: string;
    avatarUrl?: string;
    role?: AppRole;
    isEmailVerified?: boolean;
  }): UserAccount {
    this.initialize();
    const emailKey = params.email.toLowerCase().trim();

    if (userRegistry.has(emailKey)) {
      throw new Error('An account with this email address already exists.');
    }

    let passwordHash: string | undefined;
    let salt: string | undefined;

    if (params.password) {
      const hashed = this.hashPassword(params.password);
      passwordHash = hashed.hash;
      salt = hashed.salt;
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: params.name,
      email: emailKey,
      phone: params.phone,
      passwordHash,
      salt,
      googleSub: params.googleSub,
      avatarUrl: params.avatarUrl,
      role: params.role || (emailKey === this.PRIMARY_SUPER_ADMIN_EMAIL ? 'SUPER_ADMIN' : 'USER'),
      isEmailVerified: params.isEmailVerified ?? false,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    userRegistry.set(emailKey, newUser);
    return newUser;
  }

  public static updateUser(email: string, updates: Partial<UserAccount>): UserAccount {
    const user = this.getUserByEmail(email);
    if (!user) throw new Error('User not found');

    if (user.email === this.PRIMARY_SUPER_ADMIN_EMAIL && updates.role && updates.role !== 'SUPER_ADMIN') {
      throw new Error('Cannot demote primary Super Admin account.');
    }

    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    userRegistry.set(user.email, user);
    return user;
  }

  // --- SESSIONS & TOKENS ---
  public static createSession(userId: string, email: string, role: AppRole, ttlMs: number = 7 * 24 * 60 * 60 * 1000): UserSession {
    const sessionId = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const session: UserSession = {
      sessionId,
      userId,
      email: email.toLowerCase().trim(),
      role,
      expiresAt: Date.now() + ttlMs,
    };
    sessionRegistry.set(sessionId, session);
    return session;
  }

  public static getSession(sessionId: string): UserSession | null {
    const session = sessionRegistry.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      sessionRegistry.delete(sessionId);
      return null;
    }
    return session;
  }

  public static deleteSession(sessionId: string): void {
    sessionRegistry.delete(sessionId);
  }

  // --- RATE LIMITING ---
  public static checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): { allowed: boolean; remainingSeconds: number } {
    const now = Date.now();
    const record = rateLimitTracker.get(key);

    if (!record || now > record.windowExpiresAt) {
      rateLimitTracker.set(key, { count: 1, windowExpiresAt: now + windowMs });
      return { allowed: true, remainingSeconds: 0 };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remainingSeconds: Math.ceil((record.windowExpiresAt - now) / 1000) };
    }

    record.count += 1;
    return { allowed: true, remainingSeconds: 0 };
  }
}

// Auto-initialize store
AuthStore.initialize();
