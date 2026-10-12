-- Phase 1 business records. Depends on 20261012000003.
-- Additive only: legacy production tables are deliberately not referenced.

CREATE TABLE public.app_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  created_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  name_normalized text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  is_dry_run boolean NOT NULL DEFAULT true,
  total_leads integer NOT NULL DEFAULT 0 CHECK (total_leads >= 0),
  processed_leads integer NOT NULL DEFAULT 0 CHECK (processed_leads >= 0),
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_source text,
  legacy_import_id text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_campaigns_name_normalized_check CHECK (name_normalized = lower(btrim(name_normalized))),
  UNIQUE (organization_id, name_normalized), UNIQUE (organization_id, id)
);

CREATE TABLE public.app_lead_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  created_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  name_normalized text NOT NULL,
  source_filename text,
  import_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_source text,
  legacy_import_id text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_lead_lists_name_normalized_check CHECK (name_normalized = lower(btrim(name_normalized))),
  UNIQUE (organization_id, name_normalized), UNIQUE (organization_id, id)
);

CREATE TABLE public.app_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  created_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  app_lead_list_id uuid,
  company_name text,
  domain text,
  website text,
  contact_person text,
  title text,
  email text,
  industry text,
  location text,
  status text NOT NULL DEFAULT 'UNCONTACTED',
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_source text,
  legacy_import_id text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, app_lead_list_id) REFERENCES public.app_lead_lists(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE public.app_campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  app_campaign_id uuid NOT NULL,
  app_lead_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  assignment_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_campaign_id, app_lead_id),
  FOREIGN KEY (organization_id, app_campaign_id) REFERENCES public.app_campaigns(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, app_lead_id) REFERENCES public.app_leads(organization_id, id) ON DELETE RESTRICT
);

CREATE TABLE public.app_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  created_by_app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  email text NOT NULL,
  email_normalized text NOT NULL,
  phone text,
  company text,
  website text,
  title text,
  location text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_senders_email_normalized_check CHECK (email_normalized = lower(btrim(email_normalized))),
  UNIQUE (organization_id, email_normalized)
);

CREATE INDEX app_campaigns_organization_active_idx ON public.app_campaigns(organization_id, archived_at, created_at DESC);
CREATE INDEX app_lead_lists_organization_active_idx ON public.app_lead_lists(organization_id, archived_at, created_at DESC);
CREATE INDEX app_leads_organization_active_idx ON public.app_leads(organization_id, archived_at, created_at DESC);
CREATE INDEX app_campaign_leads_organization_idx ON public.app_campaign_leads(organization_id, app_campaign_id);
CREATE INDEX app_senders_organization_active_idx ON public.app_senders(organization_id, archived_at, created_at DESC);
CREATE UNIQUE INDEX app_campaigns_legacy_import_identity_idx ON public.app_campaigns(organization_id, legacy_source, legacy_import_id) WHERE legacy_source IS NOT NULL AND legacy_import_id IS NOT NULL;
CREATE UNIQUE INDEX app_lead_lists_legacy_import_identity_idx ON public.app_lead_lists(organization_id, legacy_source, legacy_import_id) WHERE legacy_source IS NOT NULL AND legacy_import_id IS NOT NULL;
CREATE UNIQUE INDEX app_leads_legacy_import_identity_idx ON public.app_leads(organization_id, legacy_source, legacy_import_id) WHERE legacy_source IS NOT NULL AND legacy_import_id IS NOT NULL;

ALTER TABLE public.app_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_senders ENABLE ROW LEVEL SECURITY;
