-- Campaign sender identity: durable account identity (2026-11-08).
-- NOT YET APPLIED: applying it is a production-database decision for the
-- owner (Supabase dashboard SQL editor or CLI). Until applied, profile
-- phone / WhatsApp / reply-email save to AuthStore only (per-serverless-
-- instance memory) and the profile API honestly reports
-- contactDurable=false; a new instance or redeploy loses them.
--
-- This file is self-sufficient: it adds phone/whatsapp (also added by
-- 20261102000004_app_users_contact.sql, which it supersedes for these
-- columns) and reply_email, all IF NOT EXISTS, so applying this one file
-- is enough. display_name already exists on app_users (20261012000003).

ALTER TABLE IF EXISTS public.app_users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS reply_email TEXT;
