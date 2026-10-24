import { describe, expect, it } from 'vitest';
import { safeStateMatches, buildGmailReplyMime, resolveGmailRedirectUri } from '@/lib/services/gmail-mailbox-protocol';

describe('Gmail mailbox security and formatting', () => {
  it('rejects absent or mismatched OAuth state', () => {
    expect(safeStateMatches('owner.random-state', 'owner.random-state')).toBe(true);
    expect(safeStateMatches('owner.random-state', 'other.random-state')).toBe(false);
    expect(safeStateMatches(undefined, 'owner.random-state')).toBe(false);
  });

  it('creates a multipart reply with intact text line breaks and safe HTML', () => {
    const mime = buildGmailReplyMime({
      from: 'owner@example.com', to: 'prospect@example.com', subject: 'Re: Hello',
      text: 'First paragraph\n\nBest,\nExample <Sender>', inReplyTo: '<original@example.com>',
    });
    expect(mime).toContain('Content-Type: multipart/alternative');
    expect(mime).toContain('First paragraph\n\nBest,\nExample <Sender>');
    expect(mime).toContain('First paragraph<br><br>Best,<br>Example &lt;Sender&gt;');
    expect(mime).toContain('In-Reply-To: <original@example.com>');
  });

  it('requires a fixed HTTPS callback URL in production', () => {
    expect(() => resolveGmailRedirectUri(undefined, 'https://request-host.example/api/gmail/mailboxes/callback', true)).toThrow('GMAIL_OAUTH_REDIRECT_URI');
    expect(resolveGmailRedirectUri('https://app.example.com/api/gmail/mailboxes/callback', 'http://localhost:3000/api/gmail/mailboxes/callback', true)).toBe('https://app.example.com/api/gmail/mailboxes/callback');
    expect(() => resolveGmailRedirectUri('https://app.example.com/other', 'http://localhost:3000/api/gmail/mailboxes/callback', true)).toThrow('exact Gmail mailbox callback URL');
    expect(resolveGmailRedirectUri(undefined, 'http://localhost:3000/api/gmail/mailboxes/callback', false)).toBe('http://localhost:3000/api/gmail/mailboxes/callback');
  });
});
