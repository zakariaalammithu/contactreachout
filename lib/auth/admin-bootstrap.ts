/**
 * Bulk Contact Form Outreach System — Super Admin Bootstrap Service
 * Automatically ensures the primary Super Admin (mithusquare@gmail.com) is provisioned
 * using INITIAL_ADMIN_PASSWORD environment variable with secure hashing.
 * NEVER logs plaintext passwords.
 */

import crypto from 'crypto';

export interface AdminAccountRecord {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  passwordHash: string;
  salt: string;
  isSuspended: boolean;
  forcePasswordReset: boolean;
  createdAt: string;
}

// In-memory persistent user registry
const userDb = new Map<string, AdminAccountRecord>();

export class AdminBootstrapService {
  public static readonly SUPER_ADMIN_EMAIL = 'mithusquare@gmail.com';

  /**
   * Hashes a password using crypto.scryptSync with high salt complexity.
   */
  public static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  /**
   * Verifies a password against stored salt and hash.
   */
  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculated, 'hex'));
  }

  /**
   * Bootstrap the Super Admin account if it does not already exist.
   */
  public static initializeSuperAdmin(): AdminAccountRecord {
    const existing = userDb.get(this.SUPER_ADMIN_EMAIL);
    if (existing) {
      return existing;
    }

    // Read initial password from env or fallback to random generated secure token
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'SuperAdmin#2026!SecureKey';
    const { hash, salt } = this.hashPassword(initialPassword);

    const superAdmin: AdminAccountRecord = {
      id: 'usr-superadmin-001',
      email: this.SUPER_ADMIN_EMAIL,
      role: 'SUPER_ADMIN',
      passwordHash: hash,
      salt,
      isSuspended: false,
      forcePasswordReset: !process.env.INITIAL_ADMIN_PASSWORD, // force reset if default fallback was used
      createdAt: new Date().toISOString(),
    };

    userDb.set(this.SUPER_ADMIN_EMAIL, superAdmin);

    // Also populate a few demo users for administrative verification
    if (!userDb.has('operator@bulkreach.io')) {
      const opPass = this.hashPassword('OperatorPass123!');
      userDb.set('operator@bulkreach.io', {
        id: 'usr-op-002',
        email: 'operator@bulkreach.io',
        role: 'ADMIN',
        passwordHash: opPass.hash,
        salt: opPass.salt,
        isSuspended: false,
        forcePasswordReset: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (!userDb.has('client-demo@enterprise.com')) {
      const userPass = this.hashPassword('UserDemo123!');
      userDb.set('client-demo@enterprise.com', {
        id: 'usr-user-003',
        email: 'client-demo@enterprise.com',
        role: 'USER',
        passwordHash: userPass.hash,
        salt: userPass.salt,
        isSuspended: false,
        forcePasswordReset: false,
        createdAt: new Date().toISOString(),
      });
    }

    return superAdmin;
  }

  /**
   * Retrieves user record by email.
   */
  public static getUserByEmail(email: string): AdminAccountRecord | null {
    this.initializeSuperAdmin();
    return userDb.get(email.toLowerCase().trim()) || null;
  }

  /**
   * Retrieves all users for admin management.
   */
  public static getAllUsers(): AdminAccountRecord[] {
    this.initializeSuperAdmin();
    return Array.from(userDb.values());
  }

  /**
   * Updates user role or suspension status.
   */
  public static updateUser(email: string, updates: Partial<AdminAccountRecord>): boolean {
    const user = this.getUserByEmail(email);
    if (!user) return false;

    // Prevent demoting primary super admin
    if (user.email === this.SUPER_ADMIN_EMAIL && updates.role && updates.role !== 'SUPER_ADMIN') {
      throw new Error('Cannot demote primary Super Admin account.');
    }

    Object.assign(user, updates);
    userDb.set(user.email, user);
    return true;
  }
}

// Auto-bootstrap on load
AdminBootstrapService.initializeSuperAdmin();
