/**
 * Bulk Contact Form Outreach System — Log Sanitization & Secret Redaction
 * Automatically masks credentials, tokens, API keys, and sensitive PII in logs.
 */

// Regex patterns identifying secrets and credentials
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,                        // OpenAI keys
  /sk-ant-[a-zA-Z0-9\-_]{20,}/g,                  // Anthropic keys
  /Bearer\s+[a-zA-Z0-9\-_\.]+/gi,                 // Bearer tokens
  /password["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,    // Passwords
  /secret["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,      // Secrets
  /anon_key["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,    // Supabase keys
  /service_role["']?\s*[:=]\s*["']?([^"'\s,]+)/gi,// Supabase service role
  /DATABASE_URL=([^\s]+)/gi,                       // DB connection strings
];

/**
 * Redacts secrets and credentials from strings or log objects.
 */
export function sanitizeLogOutput(input: any): any {
  if (typeof input === 'string') {
    let sanitized = input;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
    }
    return sanitized;
  }

  if (typeof input === 'object' && input !== null) {
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
        lowerKey.includes('token') ||
        lowerKey.includes('auth')
      ) {
        sanitizedObj[key] = '[REDACTED]';
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
