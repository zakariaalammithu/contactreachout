-- Passwords must survive a serverless-instance recycle, or no email
-- user can sign in from a fresh instance (AuthStore is per-instance
-- memory). The hash + salt are stored, never the password itself.
ALTER TABLE IF EXISTS public.app_users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_salt TEXT;
