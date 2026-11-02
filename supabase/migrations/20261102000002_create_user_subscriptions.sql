-- Admin subscription management + renewal reminders (2026-11-02).
-- NOT YET APPLIED: this file is a migration draft. Applying it is a
-- production-database decision for the owner (Supabase dashboard or CLI).
-- Until applied, the subscription code treats the tables as unavailable:
-- webhooks log + acknowledge (no 500 loop), the cron skips safely, admin
-- pages show an empty state, and sending is NEVER blocked (gating only
-- applies when an expired row actually exists).
--
-- Identity note: user_email is the key, NOT a FK to users(id). App users
-- have no auth.users row (the app uses its own AuthStore + HMAC sessions),
-- so users.id (UUID REFERENCES auth.users) cannot be referenced. The same
-- constraint shaped the credit-wallet finding-1 fallback.

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_name TEXT,
  credits_per_period INTEGER,
  amount_cents INTEGER,
  period TEXT CHECK (period IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired', 'paused', 'incomplete')),
  purchase_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  last_renewal_at TIMESTAMPTZ,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_email ON user_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_end ON user_subscriptions(status, current_period_end);

CREATE TABLE IF NOT EXISTS subscription_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  period_end TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'expiry_5d',
  days_left INTEGER,
  channel TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_reminders_sub ON subscription_reminders(subscription_id);

-- Minimal preference row: renewal reminders default ON. A row only needs to
-- exist when a user opts out; absence means "send".
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_email TEXT PRIMARY KEY,
  renewal_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
