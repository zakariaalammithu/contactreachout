/**
 * Bulk Contact Form Outreach System — Log Sanitization & Secret Redaction
 * Automatically masks credentials, tokens, API keys, and sensitive PII in logs.
 * NEVER exposes secrets to client components, API responses, or log files.
 */

const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9\-_]{20,}/g,                       // OpenAI keys
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,                 // Anthropic keys
  /re_[a-zA-Z0-9\-_]{20,}/g,                     // Resend keys
  /rk_[a-zA-Z0-9\-_]{20,}/g,                     // Resend keys variant
  /GOCSPX-[a-zA-Z0-9\-_]{20,}/g,                 // Google OAuth Client Secret
  /Bearer\s+[a-zA-Z0-9\-_\.]+/gi,                // Bearer tokens
  /password["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,   // Passwords
  /secret["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,     // Secrets
  /anon_key["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,   // Supabase anon key
  /service_role["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,// Supabase service role
  /DATABASE_URL=([^\s]+)/gi,                      // DB connection strings
  /REDIS_URL=([^\s]+)/gi,                         // Redis connection strings
];

/**
 * Recursively redacts secrets, credentials, and sensitive tokens from strings or objects.
 */
export function sanitizeLogOutput(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '••••••••[REDACTED]');
    }
    return sanitized;
  }

  if (typeof input === 'object') {
    if (Array.isArray(input)) {
      return input.map(sanitizeLogOutput);
    }

    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('token') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('cookie') ||
        lowerKey.includes('session') ||
        lowerKey.includes('key')
      ) {
        if (typeof value === 'string' && value.startsWith('••••')) {
          sanitizedObj[key] = value; // Already masked preview (e.g. ••••••••ABCD)
        } else {
          sanitizedObj[key] = '••••••••[REDACTED]';
        }
      } else {
        sanitizedObj[key] = sanitizeLogOutput(value);
      }
    }
    return sanitizedObj;
  }

  return input;
}

export class LogSanitizer {
  public static sanitize(text: string): string {
    return sanitizeLogOutput(text);
  }

  public static sanitizeObject(obj: Record<string, any>): Record<string, any> {
    return sanitizeLogOutput(obj);
  }
}
