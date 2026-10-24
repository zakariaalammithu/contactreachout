import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getInboxReplyError, isAcceptedInboxReply } from '@/lib/services/inbox-reply-response';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  addOutboundReply: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  SessionManager: {
    getSessionFromRequest: () => ({ userId: 'user-1', email: 'owner@example.com', role: 'USER' }),
  },
}));
vi.mock('@/lib/auth/auth-store', () => ({
  AuthStore: { getUserByEmail: () => ({ email: 'owner@example.com', isEmailVerified: true }) },
}));
vi.mock('@/lib/services/inbox-store', () => ({
  InboxStore: {
    getMessageById: () => ({ id: 'message-1', originalSubject: 'Original subject', externalMessageId: 'external_123' }),
    addOutboundReply: mocks.addOutboundReply,
  },
}));
vi.mock('@/lib/services/email/email-config', () => ({
  getEmailSenderConfig: () => ({ fromEmail: 'sender@example.com', fromName: 'ContactReachout', replyToEmail: 'reply@example.com' }),
}));
vi.mock('@/lib/services/email/resend-provider', () => ({
  ResendProvider: class { sendEmail = mocks.sendEmail; },
}));

const { POST } = await import('@/app/api/inbox/send-reply/route');

function request() {
  return new NextRequest('http://test.local/api/inbox/send-reply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messageId: 'message-1',
      recipientEmail: 'prospect@example.com',
      subject: 'Reply',
      replyText: 'Hello',
    }),
  });
}

describe('Inbox reply delivery contract', () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.addOutboundReply.mockReset();
  });

  it('returns an explicit failure and records no reply when no provider send occurs', async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      errorCode: 'MISSING_API_KEY',
      errorMessage: 'Cannot send email: RESEND_API_KEY is not configured.',
    });

    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Cannot send email: RESEND_API_KEY is not configured.' });
    expect(mocks.addOutboundReply).not.toHaveBeenCalled();
  });

  it('maps provider rejection to failure and never records a sent reply', async () => {
    mocks.sendEmail.mockResolvedValue({
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      errorMessage: 'Resend rejected the configured credential.',
    });

    const response = await POST(request());
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe('Resend rejected the configured credential.');
    expect(mocks.addOutboundReply).not.toHaveBeenCalled();
  });

  it('reports success only when the provider accepted the request with a message id', async () => {
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: 'email_123', statusCode: 200 });

    const response = await POST(request());
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      isLiveSent: true,
      providerAccepted: true,
      messageId: 'email_123',
    });
    expect(mocks.addOutboundReply).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      headers: { 'In-Reply-To': 'external_123', References: 'external_123' },
    }));
  });

  it('frontend acceptance rejects HTTP success with a false live-send marker', () => {
    expect(isAcceptedInboxReply(true, { success: true, isLiveSent: false })).toBe(false);
    expect(getInboxReplyError({})).toBe('The email provider did not accept this reply.');
    expect(isAcceptedInboxReply(true, {
      success: true,
      isLiveSent: true,
      providerAccepted: true,
      messageId: 'email_123',
    })).toBe(true);
  });
});
