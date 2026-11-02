-- Admin user management: package / dates / lifetime + durable audit log (2026-11-02).
-- NOT YET APPLIED: applying it is a production-database decision for the
-- owner (Supabase dashboard or CLI). Until applied, the admin management
-- APIs fail closed: credit add/deduct still work (wallet paths), but
-- package changes and subscription-date changes return an honest
-- tables-unavailable error and write NOTHING, never a fabricated success.
-- Apply AFTER 20261102000002_create_user_subscriptions.sql.
--
-- Identity note: same as 20261102000002 — user_email is the key, NOT a FK
-- to users(id), because app users have no auth.users row.

-- Lifetime support on the subscription row: a lifetime row has
-- period = 'lifetime', status = 'lifetime' and current_period_end = NULL
-- (no expiry, no renewal reminders). Admin-assigned lifetime rows carry
-- purchase_type = 'lifetime_admin'; a future Stripe lifetime purchase
-- would carry purchase_type = 'lifetime_payment'.
ALTER TABLE IF EXISTS user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_period_check;
ALTER TABLE IF EXISTS user_subscriptions
  ADD CONSTRAINT user_subscriptions_period_check
  CHECK (period IN ('monthly', 'yearly', 'lifetime'));

ALTER TABLE IF EXISTS user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
ALTER TABLE IF EXISTS user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
  CHECK (status IN ('active', 'past_due', 'cancelled', 'expired', 'paused', 'incomplete', 'lifetime'));

ALTER TABLE IF EXISTS user_subscriptions
  ADD COLUMN IF NOT EXISTS purchase_type TEXT NOT NULL DEFAULT 'stripe'
    CHECK (purchase_type IN ('stripe', 'manual', 'lifetime_payment', 'lifetime_admin')),
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS admin_assigned_by TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS last_admin_action_at TIMESTAMPTZ;

-- Durable admin action log. The in-memory AuditLogService (shown on
-- /admin/logs) evaporates per serverless instance; this table is the
-- durable record. request_id makes package/date actions idempotent:
-- replaying the same admin request returns the previous result instead
-- of applying twice.
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_email TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target ON admin_action_logs(target_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_request ON admin_action_logs(request_id) WHERE request_id IS NOT NULL;
