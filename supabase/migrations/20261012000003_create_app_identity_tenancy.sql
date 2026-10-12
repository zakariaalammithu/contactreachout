-- Phase 1 durable application identity and tenancy.
-- REVIEW BEFORE APPLYING: this migration is intentionally additive and does
-- not alter the legacy public.campaigns, public.leads, public.inbox_messages,
-- or public.senders tables.

DO $$
BEGIN
  IF to_regprocedure('gen_random_uuid()') IS NULL THEN
    RAISE EXCEPTION 'gen_random_uuid() is unavailable; enable/approve UUID support before applying Phase 1 migrations';
  END IF;
END $$;

CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_authstore_user_id text NOT NULL UNIQUE,
  email_normalized text NOT NULL UNIQUE,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_users_email_normalized_check CHECK (email_normalized = lower(btrim(email_normalized)))
);

CREATE TABLE public.app_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'personal' CHECK (kind IN ('personal', 'shared')),
  personal_owner_app_user_id uuid UNIQUE REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_personal_owner_check CHECK (
    (kind = 'personal' AND personal_owner_app_user_id IS NOT NULL)
    OR (kind = 'shared' AND personal_owner_app_user_id IS NULL)
  )
);

CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.app_organizations(id) ON DELETE RESTRICT,
  app_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, app_user_id)
);

CREATE INDEX organization_memberships_user_idx ON public.organization_memberships(app_user_id, organization_id);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
