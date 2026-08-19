/**
 * Bulk Contact Form Outreach System — Server-Side Secret Manager
 * Provides AES-256-GCM authenticated encryption for system credentials,
 * API key masking (••••••••ABCD), and hierarchical config resolution.
 * NEVER exposes plaintext secrets to client components or logs.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

// Derive a 256-bit key from environment or deterministic server salt
function getMasterKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'bulkreach-default-master-key-32-chars-salt';
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedSecretPayload {
  key: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  maskedPreview: string;
  description?: string;
  updatedAt: string;
}

// In-memory encrypted secrets registry (mirrored to DB system_secrets)
const secretStore = new Map<string, EncryptedSecretPayload>();

export class SecretManager {
  /**
   * Generates a safe masked preview of a sensitive secret.
   * e.g., 'sk-ant-api03-1234567890abcdef' -> '••••••••cdef'
   */
  public static maskSecret(secret: string | null | undefined): string {
    if (!secret || secret.trim().length === 0) {
      return 'NOT_CONFIGURED';
    }
    const clean = secret.trim();
    if (clean.length <= 4) {
      return '••••';
    }
    const lastFour = clean.slice(-4);
    return `••••••••${lastFour}`;
  }

  /**
   * Encrypts a plaintext secret using AES-256-GCM.
   */
  public static encrypt(plainText: string): {
    encryptedValue: string;
    iv: string;
    authTag: string;
    maskedPreview: string;
  } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag,
      maskedPreview: this.maskSecret(plainText),
    };
  }

  /**
   * Decrypts an encrypted payload using AES-256-GCM.
   */
  public static decrypt(encryptedValue: string, ivHex: string, authTagHex: string): string {
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Sets or updates an encrypted secret in storage.
   */
  public static setSecret(
    keyName: string,
    plainTextValue: string,
    orgId?: string | null,
    description?: string
  ): EncryptedSecretPayload {
    const storeKey = orgId ? `${orgId}::${keyName}` : `global::${keyName}`;
    const encrypted = this.encrypt(plainTextValue);

    const payload: EncryptedSecretPayload = {
      key: keyName,
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      maskedPreview: encrypted.maskedPreview,
      description,
      updatedAt: new Date().toISOString(),
    };

    secretStore.set(storeKey, payload);
    return payload;
  }

  /**
   * Retrieves a decrypted secret using hierarchical resolution:
   * 1. Organization/User-specific secret
   * 2. Global Admin secret
   * 3. System Environment variable fallback
   */
  public static getSecret(keyName: string, orgId?: string | null): string | null {
    // 1. Check Org specific
    if (orgId) {
      const orgPayload = secretStore.get(`${orgId}::${keyName}`);
      if (orgPayload) {
        try {
          return this.decrypt(orgPayload.encryptedValue, orgPayload.iv, orgPayload.authTag);
        } catch {
          // fallback
        }
      }
    }

    // 2. Check Global secret
    const globalPayload = secretStore.get(`global::${keyName}`);
    if (globalPayload) {
      try {
        return this.decrypt(globalPayload.encryptedValue, globalPayload.iv, globalPayload.authTag);
      } catch {
        // fallback
      }
    }

    // 3. Fallback to process.env
    return process.env[keyName] || null;
  }

  /**
   * Retrieves masked preview safely for UI representation.
   */
  public static getMaskedSecret(keyName: string, orgId?: string | null): string {
    const raw = this.getSecret(keyName, orgId);
    return this.maskSecret(raw);
  }

  /**
   * Deletes a secret from storage.
   */
  public static deleteSecret(keyName: string, orgId?: string | null): boolean {
    const storeKey = orgId ? `${orgId}::${keyName}` : `global::${keyName}`;
    return secretStore.delete(storeKey);
  }

  /**
   * Checks whether a secret is present (either stored or via env).
   */
  public static hasSecret(keyName: string, orgId?: string | null): boolean {
    const secret = this.getSecret(keyName, orgId);
    return Boolean(secret && secret.trim().length > 0);
  }

  /**
   * Returns a list of all configured integrations with masked previews (SAFE for UI).
   */
  public static getAllIntegrationsStatus(orgId?: string | null): Record<string, {
    configured: boolean;
    maskedPreview: string;
    source: 'user' | 'global' | 'env' | 'none';
  }> {
    const checkKeys = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'REDIS_URL',
    ];

    const result: Record<string, any> = {};

    for (const k of checkKeys) {
      let source: 'user' | 'global' | 'env' | 'none' = 'none';
      let masked = 'NOT_CONFIGURED';

      if (orgId && secretStore.has(`${orgId}::${k}`)) {
        source = 'user';
        masked = secretStore.get(`${orgId}::${k}`)!.maskedPreview;
      } else if (secretStore.has(`global::${k}`)) {
        source = 'global';
        masked = secretStore.get(`global::${k}`)!.maskedPreview;
      } else if (process.env[k]) {
        source = 'env';
        masked = this.maskSecret(process.env[k]);
      }

      result[k] = {
        configured: source !== 'none',
        maskedPreview: masked,
        source,
      };
    }

    return result;
  }
}
