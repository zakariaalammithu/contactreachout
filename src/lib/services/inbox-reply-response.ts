export interface InboxReplyResponsePayload {
  success?: boolean;
  isLiveSent?: boolean;
  providerAccepted?: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export function isAcceptedInboxReply(
  responseOk: boolean,
  payload: InboxReplyResponsePayload
): boolean {
  return responseOk
    && payload.success === true
    && payload.isLiveSent === true
    && payload.providerAccepted === true
    && typeof payload.messageId === 'string'
    && payload.messageId.length > 0;
}

export function getInboxReplyError(payload: InboxReplyResponsePayload): string {
  return payload.error || 'The email provider did not accept this reply.';
}
