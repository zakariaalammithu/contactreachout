-- Sender contact identity on the durable app user (2026-11-02).
-- NOT YET APPLIED: applying it is a production-database decision for the
-- owner (Supabase dashboard or CLI). Until applied, profile phone /
-- WhatsApp save to AuthStore only (per-instance memory) and the profile
-- API honestly reports contactDurable=false; campaigns on another
-- instance cannot see the numbers until this is applied.
-- Apply AFTER 20261102000003_admin_management.sql (order vs other
-- migrations does not matter; this table is independent).

ALTER TABLE IF EXISTS public.app_users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;
