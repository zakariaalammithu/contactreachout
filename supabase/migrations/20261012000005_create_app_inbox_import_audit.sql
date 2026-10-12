-- Phase 1 inbox safety and approval-gated legacy import audit. Depends on
-- 20261012000003 and 20261012000004. Inbound automation remains disabled in
-- application code until the provider contract is verified.

CREATE TABLE public.app_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  provider_message_id text,
  payload_hash text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processing_status text NOT NULL DEFAULT 'RECEIVED' CHECK (processing_status IN ('RECEIVED', 'QUARANTINED', 'PROCESSED', 'REJECTED')),
  processed_at timestamptz,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE public.app_inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  assigned_app_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  app_campaign_id uuid,
  app_lead_id uuid,
  inbound_event_id uuid UNIQUE REFERENCES public.app_inbound_events(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  external_message_id text,
  conversation_id text,
  prospect_name text,
  prospect_email text,
  company_name text,
  subject text,
  reply_message text,
  status text NOT NULL DEFAULT 'NEW',
  is_read boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, app_campaign_id) REFERENCES public.app_campaigns(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, app_lead_id) REFERENCES public.app_leads(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE public.app_inbox_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_event_id uuid REFERENCES public.app_inbound_events(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  reason_code text NOT NULL,
  review_status text NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'RESOLVED', 'REJECTED')),
  provider text,
  provider_event_id text,
  payload_hash text,
  redacted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by_app_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_legacy_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  requested_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('PREVIEWED', 'APPROVED', 'RUNNING', 'COMPLETED', 'FAILED')),
  preview_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_legacy_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.app_legacy_import_batches(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_record_id text,
  source_record_hash text NOT NULL,
  target_table text,
  target_record_id uuid,
  disposition text NOT NULL CHECK (disposition IN ('READY', 'IMPORTED', 'DUPLICATE', 'SKIPPED', 'QUARANTINED', 'FAILED')),
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, source_type, source_record_hash)
);

CREATE INDEX app_inbox_messages_organization_idx ON public.app_inbox_messages(organization_id, is_archived, received_at DESC);
CREATE INDEX app_inbox_quarantine_review_idx ON public.app_inbox_quarantine(review_status, created_at DESC);
CREATE INDEX app_legacy_import_batches_organization_idx ON public.app_legacy_import_batches(organization_id, created_at DESC);

ALTER TABLE public.app_inbound_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_inbox_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_legacy_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_legacy_import_items ENABLE ROW LEVEL SECURITY;
