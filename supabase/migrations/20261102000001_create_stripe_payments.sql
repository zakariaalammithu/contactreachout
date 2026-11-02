-- Durable Stripe payment records (2026-11-02, credit + Stripe fix batch).
-- NOT YET APPLIED: this file is a migration draft. Applying it is a
-- production-database decision for the owner (Supabase dashboard or CLI).
-- Until applied, the app's stripe-payment-record module treats the table as
-- unavailable and falls back to the in-memory PaymentStore with no behavior
-- change. After applying, payment history and admin revenue survive cold
-- starts, and renewals/refunds/cancellations have a durable record.
--
-- session_id holds the Stripe object id: checkout session ids (cs_*) for
-- purchases, invoice ids (in_*) for renewal/failure records. The prefixes
-- never collide, so one table serves as the payment-event log.

CREATE TABLE IF NOT EXISTS stripe_payments (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits >= 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  credited BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT,
  purchase_type TEXT NOT NULL DEFAULT 'subscription' CHECK (purchase_type IN ('one_time', 'subscription')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_user ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
