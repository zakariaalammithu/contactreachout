/**
 * Multi-Tenant Production Inbox Storage & Security Service
 * Enforces strict server-side user isolation (User A sees only User A's data).
 * Supports canonical relations (user_id, campaign_id, lead_id, conversation_id, external_message_id),
 * idempotency deduplication, and UNMATCHED status handling.
 */

export interface InboxMessage {
  id: string;
  userId: string;
  userEmail: string;
  campaignId?: string;
  leadId?: string;
  conversationId?: string;
  externalMessageId?: string;
  direction?: 'inbound' | 'outbound';
  prospectName: string;
  email: string;
  companyName: string;
  website: string;
  campaignName: string;
  date: string;
  createdAt: string;
  isUnread: boolean;
  status: 'INTERESTED' | 'QUESTION' | 'REPLIED' | 'NEW' | 'UNMATCHED';
  originalSubject: string;
  originalMessage: string;
  replyMessage: string;
  replySent?: string;
  replySentAt?: string;
  forwardedToEmail: string;
}

// In-memory server-side store keyed by message ID
const messageStore = new Map<string, InboxMessage>();

// Idempotency registry keyed by externalMessageId or payload signature
const processedExternalMessageIds = new Set<string>();

export class InboxStore {
  /**
   * Retrieves all inbox messages for a specific authenticated user.
   * Enforces server-side tenant isolation.
   */
  public static getMessagesForUser(userEmail: string): InboxMessage[] {
    const key = (userEmail || '').toLowerCase().trim();
    if (!key) return [];

    const userMessages = Array.from(messageStore.values()).filter(
      (m) => m.userEmail.toLowerCase().trim() === key
    );

    // Sort newest first
    return userMessages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Admin / Super Admin platform-wide query (Authorized Admin scope only).
   */
  public static getAllMessagesForAdmin(): InboxMessage[] {
    return Array.from(messageStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Calculates dynamic unread messages count for a user.
   */
  public static getUnreadCount(userEmail: string): number {
    const messages = this.getMessagesForUser(userEmail);
    return messages.filter((m) => m.isUnread).length;
  }

  /**
   * Retrieves a single message with strict user isolation (IDOR protection).
   */
  public static getMessageById(userEmail: string, messageId: string, isAdmin = false): InboxMessage | null {
    const key = (userEmail || '').toLowerCase().trim();
    const msg = messageStore.get(messageId);
    if (!msg) return null;

    if (!isAdmin && msg.userEmail.toLowerCase().trim() !== key) {
      return null; // IDOR Protection: Block unauthorized cross-tenant access
    }
    return msg;
  }

  /**
   * Marks a message as read for the owner.
   */
  public static markAsRead(userEmail: string, messageId: string, isAdmin = false): InboxMessage | null {
    const msg = this.getMessageById(userEmail, messageId, isAdmin);
    if (!msg) return null;
    msg.isUnread = false;
    messageStore.set(msg.id, msg);
    return msg;
  }

  /**
   * Adds an incoming reply (from webhook, Resend inbound, or system detection).
   * Enforces idempotency to prevent duplicate messages from webhook retries.
   */
  public static addIncomingReply(params: {
    userId?: string;
    userEmail: string;
    campaignId?: string;
    leadId?: string;
    conversationId?: string;
    externalMessageId?: string;
    prospectName: string;
    email: string;
    companyName?: string;
    website?: string;
    campaignName?: string;
    originalSubject?: string;
    originalMessage?: string;
    replyMessage: string;
    status?: 'INTERESTED' | 'QUESTION' | 'REPLIED' | 'NEW' | 'UNMATCHED';
    forwardedToEmail?: string;
  }): InboxMessage {
    const cleanUserEmail = params.userEmail.toLowerCase().trim();
    const cleanProspectEmail = params.email.toLowerCase().trim();

    // Idempotency Key Generation (externalMessageId or deterministic payload signature)
    const idempotencyKey =
      params.externalMessageId?.trim() ||
      `sig_${cleanUserEmail}_${cleanProspectEmail}_${params.replyMessage.trim().substring(0, 40)}`;

    if (processedExternalMessageIds.has(idempotencyKey)) {
      // Return existing message if already processed (Deduplication)
      const existing = Array.from(messageStore.values()).find(
        (m) =>
          m.externalMessageId === idempotencyKey ||
          (m.userEmail === cleanUserEmail && m.email === cleanProspectEmail && m.replyMessage === params.replyMessage.trim())
      );
      if (existing) return existing;
    }

    const now = new Date();
    const convId = params.conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMessage: InboxMessage = {
      id: `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: params.userId || `usr_${cleanUserEmail}`,
      userEmail: cleanUserEmail,
      campaignId: params.campaignId,
      leadId: params.leadId,
      conversationId: convId,
      externalMessageId: idempotencyKey,
      direction: 'inbound',
      prospectName: params.prospectName.trim() || cleanProspectEmail.split('@')[0],
      email: cleanProspectEmail,
      companyName: params.companyName?.trim() || 'Target Organization',
      website: params.website?.trim() || `https://${cleanProspectEmail.split('@')[1] || 'domain.com'}`,
      campaignName: params.campaignName?.trim() || (params.status === 'UNMATCHED' ? 'Unmatched Inquiry' : 'Outreach Campaign'),
      date: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      isUnread: true,
      status: params.status || 'INTERESTED',
      originalSubject: params.originalSubject?.trim() || 'Outreach Inquiry',
      originalMessage: params.originalMessage?.trim() || 'Outreach message submitted via website contact form.',
      replyMessage: params.replyMessage.trim(),
      forwardedToEmail: params.forwardedToEmail?.trim() || cleanUserEmail,
    };

    processedExternalMessageIds.add(idempotencyKey);
    messageStore.set(newMessage.id, newMessage);
    return newMessage;
  }

  /**
   * Logs an outbound email reply sent to a prospect.
   */
  public static addOutboundReply(
    userEmail: string,
    messageId: string,
    replyText: string,
    isAdmin = false
  ): InboxMessage | null {
    const msg = this.getMessageById(userEmail, messageId, isAdmin);
    if (!msg) return null;

    msg.replySent = replyText.trim();
    msg.replySentAt = new Date().toISOString();
    msg.status = 'REPLIED';
    msg.isUnread = false;

    messageStore.set(msg.id, msg);
    return msg;
  }
}
