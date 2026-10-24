import { describe, expect, it } from 'vitest';
import { parseGmailMessage, htmlToText } from '@/lib/services/gmail-message-parser';

const b64url = (value) => Buffer.from(value, 'utf8').toString('base64url');

function messageWithParts(parts) {
  return {
    id: 'msg-1',
    threadId: 'thread-1',
    internalDate: '1760000000000',
    payload: {
      headers: [
        { name: 'From', value: 'Prospect <prospect@example.com>' },
        { name: 'To', value: 'owner@example.com' },
        { name: 'Subject', value: 'Interested in your service' },
        { name: 'Message-ID', value: '<msg-1@example.com>' },
      ],
      parts,
    },
  };
}

describe('Gmail message parser', () => {
  it('imports an HTML-only message instead of dropping it', () => {
    const parsed = parseGmailMessage(messageWithParts([
      { mimeType: 'text/html', body: { data: b64url('<p>Hello <b>team</b>,</p><p>Please send pricing &amp; details.</p>') } },
    ]));
    expect(parsed).not.toBeNull();
    expect(parsed.text).toContain('Hello team');
    expect(parsed.text).toContain('Please send pricing & details.');
  });

  it('prefers the plain-text part when both exist', () => {
    const parsed = parseGmailMessage(messageWithParts([
      { mimeType: 'text/plain', body: { data: b64url('Plain version') } },
      { mimeType: 'text/html', body: { data: b64url('<p>HTML version</p>') } },
    ]));
    expect(parsed.text).toBe('Plain version');
  });

  it('never keeps script or style content from HTML mail', () => {
    expect(htmlToText('<style>.a{color:red}</style><script>alert(1)</script><p>Safe text</p>')).toBe('Safe text');
  });
});
