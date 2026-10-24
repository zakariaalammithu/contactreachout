-- Durable Unified Inbox. Depends on 20261012000003, 20261012000005, and
-- 20261014000001. Additive only: legacy public.inbox_messages is untouched.
-- REVIEW BEFORE APPLYING: this migration intentionally creates no browser-role
-- policies. Server-only service-role repositories remain the sole access path.

-- A mailbox may belong to one organization only. Stop safely if an earlier
-- pre-production deployment created a conflicting cross-organization mapping;
-- reconciliation must be approved rather than silently reassigning mailboxes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.app_connected_mailboxes
    GROUP BY email_normalized HAVING count(DISTINCT organization_id) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one organization per Gmail mailbox: duplicate email_normalized mappings require manual reconciliation';
  END IF;
END $$;

CREATE UNIQUE INDEX app_connected_mailboxes_global_email_unique_idx
  ON public.app_connected_mailboxes(email_normalized);

CREATE TABLE public.app_inbox_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  connected_mailbox_id uuid NOT NULL,
  assigned_app_user_id uuid,
  provider text NOT NULL CHECK (provider IN ('gmail')),
  provider_thread_id text NOT NULL,
  subject_preview text,
  latest_message_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'OPEN', 'REPLIED', 'UNMATCHED', 'CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (connected_mailbox_id, provider_thread_id),
  FOREIGN KEY (organization_id, connected_mailbox_id)
    REFERENCES public.app_connected_mailboxes(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, assigned_app_user_id)
    REFERENCES public.organization_memberships(organization_id, app_user_id) ON DELETE RESTRICT
);

CREATE TABLE public.app_inbox_conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.app_inbox_conversations(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL,
  app_user_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, app_user_id),
  FOREIGN KEY (organization_id, app_user_id)
    REFERENCES public.organization_memberships(organization_id, app_user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, conversation_id)
    REFERENCES public.app_inbox_conversations(organization_id, id) ON DELETE RESTRICT
);

ALTER TABLE public.app_inbox_messages
  ADD COLUMN app_inbox_conversation_id uuid;

ALTER TABLE public.app_inbox_messages
  ADD CONSTRAINT app_inbox_messages_conversation_tenant_fkey
  FOREIGN KEY (organization_id, app_inbox_conversation_id)
  REFERENCES public.app_inbox_conversations(organization_id, id) ON DELETE RESTRICT;

CREATE INDEX app_inbox_conversations_org_latest_idx
  ON public.app_inbox_conversations(organization_id, latest_message_at DESC);
CREATE INDEX app_inbox_conversation_members_member_unread_idx
  ON public.app_inbox_conversation_members(organization_id, app_user_id, is_archived, is_read);
CREATE INDEX app_inbox_messages_conversation_received_idx
  ON public.app_inbox_messages(app_inbox_conversation_id, received_at ASC);

ALTER TABLE public.app_inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_inbox_conversation_members ENABLE ROW LEVEL SECURITY;
