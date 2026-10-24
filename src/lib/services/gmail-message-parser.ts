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
  const text = (findPlainText(payload) || decodeBase64Url(payload?.body?.data)).replace(/\r\n?/g, '\n').slice(0, MAX_BODY_LENGTH).trim();
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
