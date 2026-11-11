-- Sender company + website + job title + country: durable account
-- identity (2026-11-11).
-- NOT YET APPLIED: applying it is a production-database decision for the
-- owner (Supabase dashboard SQL editor or CLI). Until applied, profile
-- company / website / job title / country save to AuthStore only
-- (per-serverless-instance memory) and the profile API honestly reports
-- contactDurable=false for saves that include them; phone / WhatsApp /
-- reply-email durability is unaffected (the read/write paths fall back
-- to the pre-existing columns when these do not exist yet).
--
-- A contact form's Company / Website / Job Title / Country fields ask
-- for the SENDER's company, website, job title and country, so they must
-- come from the account identity — not from the prospect lead (the mapper
-- previously filled them from lead.company_name / lead.website /
-- lead.job_title / lead.country, i.e. the prospect's own details as if
-- they were the sender's).

ALTER TABLE IF EXISTS public.app_users
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;
