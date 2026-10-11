-- Persistent support-assistant knowledge, conversations, tickets and notifications.
-- This is additive: it does not modify campaigns, billing, or existing inbox data.

CREATE TABLE IF NOT EXISTS support_kb_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS support_kb_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES support_kb_categories(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    alternative_questions TEXT[] NOT NULL DEFAULT '{}',
    related_entry_ids UUID[] NOT NULL DEFAULT '{}',
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'disabled')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_kb_entry_unique_question UNIQUE (organization_id, question)
);
CREATE INDEX IF NOT EXISTS idx_support_kb_entries_search ON support_kb_entries
    USING GIN (to_tsvector('simple', coalesce(question, '') || ' ' || coalesce(answer, '')));
CREATE INDEX IF NOT EXISTS idx_support_kb_entries_status_category ON support_kb_entries(organization_id, status, category_id);

CREATE TABLE IF NOT EXISTS support_ai_instruction_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    instructions TEXT NOT NULL,
    tone TEXT NOT NULL DEFAULT 'friendly',
    preferred_response_length TEXT NOT NULL DEFAULT 'concise',
    fallback_message TEXT NOT NULL,
    restricted_topics TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    version INTEGER NOT NULL CHECK (version > 0),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS support_ai_single_published_instruction
    ON support_ai_instruction_versions(organization_id) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visitor_token_hash TEXT,
    visitor_name TEXT,
    visitor_email TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting_support', 'waiting_customer', 'resolved', 'archived')),
    assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_unread_count INTEGER NOT NULL DEFAULT 0 CHECK (customer_unread_count >= 0),
    agent_unread_count INTEGER NOT NULL DEFAULT 0 CHECK (agent_unread_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (user_id IS NOT NULL OR visitor_token_hash IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS support_conversations_visitor_active
    ON support_conversations(organization_id, visitor_token_hash)
    WHERE visitor_token_hash IS NOT NULL AND status <> 'archived';
CREATE INDEX IF NOT EXISTS idx_support_conversations_agent_queue ON support_conversations(organization_id, status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    sender_kind TEXT NOT NULL CHECK (sender_kind IN ('visitor', 'customer', 'ai', 'agent', 'system')),
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
    client_idempotency_key TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, client_idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_created ON support_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL UNIQUE REFERENCES support_conversations(id) ON DELETE CASCADE,
    escalation_reason TEXT NOT NULL,
    category TEXT,
    notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending', 'accepted', 'failed', 'not_configured')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    recipient TEXT NOT NULL,
    provider_message_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('accepted', 'failed', 'not_configured')),
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ticket_id, recipient)
);

ALTER TABLE support_kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_kb_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ai_instruction_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_notification_log ENABLE ROW LEVEL SECURITY;

-- Browser roles may only read published knowledge. All conversation, ticket,
-- instruction and mutation access stays behind authenticated server endpoints.
CREATE POLICY support_kb_public_read ON support_kb_entries
    FOR SELECT USING (status = 'published');
REVOKE ALL ON support_kb_categories, support_ai_instruction_versions, support_conversations,
    support_messages, support_tickets, support_notification_log FROM anon, authenticated;
