-- Gmail mailbox connectivity and sync metadata. Depends on the Phase 1 app_*
-- migrations, especially 20261012000003 and 20261012000005. Additive only;
-- this migration never changes the legacy public.inbox_messages table.
-- REVIEW BEFORE APPLYING: no browser-role policies are created.

CREATE TABLE public.app_connected_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  owner_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('gmail')),
  email_normalized text NOT NULL,
  encrypted_refresh_token text NOT NULL,
  refresh_token_iv text NOT NULL,
  refresh_token_auth_tag text NOT NULL,
  granted_scopes text[] NOT NULL DEFAULT '{}',
  connection_status text NOT NULL DEFAULT 'ACTIVE' CHECK (connection_status IN ('ACTIVE', 'REAUTH_REQUIRED', 'REVOKED', 'DISCONNECTED', 'ERROR')),
  gmail_history_id text,
  watch_expiration_at timestamptz,
  last_synced_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_connected_mailboxes_email_normalized_check CHECK (email_normalized = lower(btrim(email_normalized))),
  UNIQUE (organization_id, email_normalized),
  UNIQUE (organization_id, id)
);

CREATE TABLE public.app_mailbox_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  connected_mailbox_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('gmail')),
  provider_event_id text NOT NULL,
  history_id text,
  payload_hash text NOT NULL,
  processing_status text NOT NULL DEFAULT 'RECEIVED' CHECK (processing_status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'RETRYABLE_FAILURE', 'PERMANENT_FAILURE')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, connected_mailbox_id) REFERENCES public.app_connected_mailboxes(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (connected_mailbox_id, provider_event_id)
);

ALTER TABLE public.app_inbox_messages
  ADD COLUMN connected_mailbox_id uuid,
  ADD COLUMN provider_thread_id text,
  ADD COLUMN provider_message_id text,
  ADD COLUMN direction text NOT NULL DEFAULT 'INBOUND' CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  ADD COLUMN sender_email text,
  ADD COLUMN recipient_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN message_headers jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.app_inbox_messages
  ADD CONSTRAINT app_inbox_messages_connected_mailbox_tenant_fkey
  FOREIGN KEY (organization_id, connected_mailbox_id)
  REFERENCES public.app_connected_mailboxes(organization_id, id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX app_inbox_messages_provider_message_identity_idx
  ON public.app_inbox_messages(connected_mailbox_id, provider_message_id)
  WHERE connected_mailbox_id IS NOT NULL AND provider_message_id IS NOT NULL;
CREATE INDEX app_connected_mailboxes_owner_idx ON public.app_connected_mailboxes(owner_app_user_id, organization_id, connection_status);
CREATE INDEX app_mailbox_sync_events_pending_idx ON public.app_mailbox_sync_events(connected_mailbox_id, processing_status, created_at);
CREATE INDEX app_inbox_messages_mailbox_thread_idx ON public.app_inbox_messages(connected_mailbox_id, provider_thread_id, received_at);

ALTER TABLE public.app_connected_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_mailbox_sync_events ENABLE ROW LEVEL SECURITY;
