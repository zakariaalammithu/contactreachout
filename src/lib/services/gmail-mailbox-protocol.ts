import crypto from 'node:crypto';

export function safeStateMatches(expected: string | undefined, actual: string | null): boolean {
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Keeps the OAuth callback stable in production instead of accepting a
 * request-controlled Host header. Local development may use the current
 * localhost origin until a fixed URL is configured.
 */
export function resolveGmailRedirectUri(configuredValue: string | undefined, fallback: string, production: boolean): string {
  const value = configuredValue?.trim();
  if (!value) {
    if (production) throw new Error('GMAIL_OAUTH_REDIRECT_URI must be configured in production.');
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('GMAIL_OAUTH_REDIRECT_URI must be a valid absolute URL.');
  }
  if (url.pathname !== '/api/gmail/mailboxes/callback' || url.search || url.hash || url.username || url.password) {
    throw new Error('GMAIL_OAUTH_REDIRECT_URI must be the exact Gmail mailbox callback URL.');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && !production && url.hostname === 'localhost')) {
    throw new Error('GMAIL_OAUTH_REDIRECT_URI must use HTTPS outside local development.');
  }
  return url.toString();
}

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string): string {
  const clean = cleanHeader(value);
  return /[^\x20-\x7E]/.test(clean) ? `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=` : clean;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildGmailReplyMime(input: { from: string; to: string; subject: string; text: string; inReplyTo?: string; references?: string }) {
  const boundary = `cr-${crypto.randomUUID()}`;
  const headers = [
    `From: ${cleanHeader(input.from)}`,
    `To: ${cleanHeader(input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${cleanHeader(input.inReplyTo)}`);
  if (input.references) headers.push(`References: ${cleanHeader(input.references)}`);
  const html = escapeHtml(input.text).replace(/\r?\n/g, '<br>');
  return `${headers.join('\r\n')}\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${input.text.replace(/\r\n?/g, '\n')}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<html><body>${html}</body></html>\r\n--${boundary}--\r\n`;
}
