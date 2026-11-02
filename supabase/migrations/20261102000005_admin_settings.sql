-- Admin settings key/value store for durable admin configuration.
-- DO NOT APPLY WITHOUT OWNER PERMISSION. Created 2026-11-02 for the
-- admin-area durability fixes (security policies, system settings,
-- credit rules, browser/campaign policies, chatbot prompt, pricing
-- specs). Until this migration is applied, admin saves that depend on
-- this table fail closed with an honest error instead of pretending
-- to persist.
--
-- Access is via the Supabase service-role key only (server-side admin
-- routes); no client-side or anon access is intended, so no RLS
-- policies are defined here. Service role bypasses RLS regardless.

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_settings IS 'Durable admin configuration (security policies, system settings, credit rules, browser/campaign policies, chatbot prompt). Written only by server-side admin routes via the service-role key.';
