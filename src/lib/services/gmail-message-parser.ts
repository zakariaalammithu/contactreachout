/** Browser-safe parsing helpers for Gmail API payloads. They deliberately do
 * not render HTML or retain raw MIME data. */
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
type GmailHeader = { name?: string; value?: string };

const MAX_BODY_LENGTH = 100_000;

function decodeBase64Url(value?: string): string {
  if (!value) return '';
  try { return Buffer.from(value, 'base64url').toString('utf8'); } catch { return ''; }
}

function findPlainText(part?: GmailPart): string {
  if (!part) return '';
  if (part.mimeType === 'text/plain') return decodeBase64Url(part.body?.data);
  for (const child of part.parts || []) {
    const found = findPlainText(child);
    if (found) return found;
  }
  return '';
}

function findHtml(part?: GmailPart): string {
  if (!part) return '';
  if (part.mimeType === 'text/html') return decodeBase64Url(part.body?.data);
  for (const child of part.parts || []) {
    const found = findHtml(child);
    if (found) return found;
  }
  return '';
}

/**
 * Last-resort text for HTML-only messages. Without this, the sync service
 * silently dropped every HTML-only inbound email (a large share of real
 * mail) because it requires a non-empty text body. Tags are stripped, never
 * rendered, and script/style content is removed entirely.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function header(headers: GmailHeader[] | undefined, name: string): string {
  return String(headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || '').replace(/[\r\n]+/g, ' ').trim();
}

export type ParsedGmailMessage = {
  providerMessageId: string;
  providerThreadId: string;
  rfcMessageId: string;
  inReplyTo: string;
  references: string;
  from: string;
  to: string[];
  subject: string;
  receivedAt: string;
  text: string;
};

export function parseGmailMessage(message: { id?: string; threadId?: string; internalDate?: string; payload?: { headers?: GmailHeader[]; body?: { data?: string }; parts?: GmailPart[] } }): ParsedGmailMessage | null {
  if (!message.id || !message.threadId) return null;
  const payload = message.payload;
  const plain = findPlainText(payload) || decodeBase64Url(payload?.body?.data);
  const text = (plain.trim() ? plain : htmlToText(findHtml(payload))).replace(/\r\n?/g, '\n').slice(0, MAX_BODY_LENGTH).trim();
  const millis = Number(message.internalDate);
  return {
    providerMessageId: message.id,
    providerThreadId: message.threadId,
    rfcMessageId: header(payload?.headers, 'Message-ID'),
    inReplyTo: header(payload?.headers, 'In-Reply-To'),
    references: header(payload?.headers, 'References'),
    from: header(payload?.headers, 'From'),
    to: header(payload?.headers, 'To').split(',').map((value) => value.trim()).filter(Boolean),
    subject: header(payload?.headers, 'Subject'),
    receivedAt: Number.isFinite(millis) ? new Date(millis).toISOString() : new Date().toISOString(),
    text,
  };
}
