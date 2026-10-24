import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findMailbox: vi.fn(),
  claimEvent: vi.fn(),
  finishEvent: vi.fn(),
  synchronize: vi.fn(),
}));

vi.mock('@/lib/persistence/gmail-mailbox-repository', () => ({
  findConnectedMailboxByEmail: mocks.findMailbox,
}));
vi.mock('@/lib/persistence/gmail-sync-repository', () => ({
  claimMailboxSyncEvent: mocks.claimEvent,
  finishMailboxSyncEvent: mocks.finishEvent,
}));
vi.mock('@/lib/services/gmail-sync-service', () => ({
  synchronizeGmailMailbox: mocks.synchronize,
}));

const { POST } = await import('@/app/api/gmail/pubsub/route');

const audience = 'https://contactreachout.example/api/gmail/pubsub';
const serviceAccount = 'gmail-push@project.iam.gserviceaccount.com';

function request() {
  const data = Buffer.from(JSON.stringify({ emailAddress: 'owner@example.com', historyId: 'history-1' })).toString('base64');
  return new NextRequest('http://test.local/api/gmail/pubsub', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify({ message: { messageId: 'provider-event-1', data } }),
  });
}

describe('Gmail Pub/Sub route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_GMAIL_PUBSUB_AUDIENCE = audience;
    process.env.GOOGLE_GMAIL_PUBSUB_SERVICE_ACCOUNT = serviceAccount;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      aud: audience,
      iss: 'https://accounts.google.com',
      email: serviceAccount,
      email_verified: true,
    }), { status: 200 })));
    mocks.findMailbox.mockResolvedValue({ id: 'mailbox-1', organization_id: 'organization-1' });
    mocks.finishEvent.mockResolvedValue(undefined);
  });

  it('records a successful event only after synchronization completes', async () => {
    mocks.claimEvent.mockResolvedValue(true);
    mocks.synchronize.mockResolvedValue({ imported: 1, duplicates: 0, cursorRecovered: false });

    const response = await POST(request());
    expect(response.status).toBe(204);
    expect(mocks.finishEvent).toHaveBeenCalledWith('mailbox-1', 'provider-event-1', 'PROCESSED');
  });

  it('acknowledges duplicate delivery without synchronizing a second time', async () => {
    mocks.claimEvent.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(204);
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });

  it('keeps a failed synchronization retryable and asks Pub/Sub to redeliver', async () => {
    mocks.claimEvent.mockResolvedValue(true);
    mocks.synchronize.mockRejectedValue(new Error('temporary failure'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(mocks.finishEvent).toHaveBeenCalledWith('mailbox-1', 'provider-event-1', 'RETRYABLE_FAILURE');
  });
});
