-- Durable, server-authoritative credit balances and an immutable idempotent ledger.
-- This migration intentionally does not manufacture balances from process memory.

CREATE TABLE IF NOT EXISTS credit_wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    free_monthly_credits INTEGER NOT NULL DEFAULT 100 CHECK (free_monthly_credits >= 0),
    free_monthly_used INTEGER NOT NULL DEFAULT 0 CHECK (free_monthly_used >= 0 AND free_monthly_used <= free_monthly_credits),
    paid_credits INTEGER NOT NULL DEFAULT 0 CHECK (paid_credits >= 0),
    bonus_credits INTEGER NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
    lifetime_credits_purchased INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_credits_purchased >= 0),
    lifetime_credits_used INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_credits_used >= 0),
    free_credit_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
    free_credit_period_end TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT,
    lead_id TEXT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'FREE_MONTHLY_GRANT', 'PURCHASE', 'USAGE', 'BONUS', 'REFUND',
        'ADMIN_ADJUSTMENT', 'REFERRAL_BONUS', 'REFERRAL_SIGNUP_BONUS'
    )),
    credit_source TEXT NOT NULL CHECK (credit_source IN ('FREE', 'PAID', 'BONUS')),
    amount INTEGER NOT NULL CHECK (amount <> 0),
    balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    description TEXT NOT NULL,
    reference_id TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT credit_ledger_user_idempotency_unique UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created_at ON credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_campaign_lead ON credit_ledger(campaign_id, lead_id);

-- Explicit staging table: administrators may reconcile exported legacy balances
-- only after mapping each source record to a real Supabase users.id.  The unique
-- source key makes reconciliation safe to rerun without duplicate grants.
CREATE TABLE IF NOT EXISTS credit_legacy_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount <> 0),
    transaction_type TEXT NOT NULL,
    credit_source TEXT NOT NULL CHECK (credit_source IN ('FREE', 'PAID', 'BONUS')),
    description TEXT NOT NULL,
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT credit_legacy_reconciliation_source_unique UNIQUE (source_system, source_record_id)
);

ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_legacy_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_wallet_owner_read ON credit_wallets
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY credit_ledger_owner_read ON credit_ledger
    FOR SELECT USING (user_id = auth.uid());

-- All mutations go through the service-role RPC below. Do not grant direct
-- INSERT/UPDATE access to browser roles.
REVOKE ALL ON credit_wallets, credit_ledger, credit_legacy_reconciliation FROM anon, authenticated;

CREATE OR REPLACE FUNCTION apply_credit_transaction(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_credit_source TEXT,
    p_description TEXT,
    p_idempotency_key TEXT,
    p_campaign_id TEXT DEFAULT NULL,
    p_lead_id TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS TABLE(wallet JSONB, transaction JSONB, applied BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet credit_wallets%ROWTYPE;
    v_ledger credit_ledger%ROWTYPE;
    v_before INTEGER;
    v_after INTEGER;
    v_cost INTEGER;
    v_effective_source TEXT;
    v_created BOOLEAN := FALSE;
    v_period_start TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'Credit idempotency key is required';
    END IF;

    SELECT * INTO v_ledger FROM credit_ledger
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
        SELECT * INTO v_wallet FROM credit_wallets WHERE user_id = p_user_id;
        RETURN QUERY SELECT to_jsonb(v_wallet), to_jsonb(v_ledger), FALSE;
        RETURN;
    END IF;

    INSERT INTO credit_wallets (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING TRUE INTO v_created;

    SELECT * INTO v_wallet FROM credit_wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_created THEN
        INSERT INTO credit_ledger (user_id, transaction_type, credit_source, amount,
            balance_before, balance_after, description, idempotency_key)
        VALUES (p_user_id, 'FREE_MONTHLY_GRANT', 'FREE', 100, 0, 100,
            'Initial monthly free credit grant',
            'initial-monthly-' || to_char(v_wallet.free_credit_period_start, 'YYYY-MM'));
    END IF;

    -- Non-rollover monthly credit reset is serialized by the row lock.
    IF v_wallet.free_credit_period_start < v_period_start THEN
        v_before := (v_wallet.free_monthly_credits - v_wallet.free_monthly_used)
                  + v_wallet.paid_credits + v_wallet.bonus_credits;
        UPDATE credit_wallets
        SET free_monthly_credits = 100,
            free_monthly_used = 0,
            free_credit_period_start = v_period_start,
            free_credit_period_end = v_period_start + INTERVAL '1 month',
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING * INTO v_wallet;
        INSERT INTO credit_ledger (user_id, transaction_type, credit_source, amount,
            balance_before, balance_after, description, idempotency_key)
        VALUES (p_user_id, 'FREE_MONTHLY_GRANT', 'FREE', 100, v_before,
            (v_wallet.free_monthly_credits - v_wallet.free_monthly_used) + v_wallet.paid_credits + v_wallet.bonus_credits,
            'Monthly free credit grant', 'monthly-reset-' || to_char(v_period_start, 'YYYY-MM'))
        ON CONFLICT (user_id, idempotency_key) DO NOTHING;
    END IF;

    -- A zero amount is permitted only to create/read the locked wallet and its
    -- initial grant record. It never changes a balance or creates a new ledger
    -- entry beyond the initial grant above.
    IF p_amount = 0 THEN
        SELECT * INTO v_ledger FROM credit_ledger
        WHERE user_id = p_user_id
          AND idempotency_key = 'initial-monthly-' || to_char(v_wallet.free_credit_period_start, 'YYYY-MM');
        RETURN QUERY SELECT to_jsonb(v_wallet), to_jsonb(v_ledger), FALSE;
        RETURN;
    END IF;

    v_before := (v_wallet.free_monthly_credits - v_wallet.free_monthly_used)
              + v_wallet.paid_credits + v_wallet.bonus_credits;
    v_effective_source := p_credit_source;

    IF p_amount < 0 THEN
        v_cost := -p_amount;
        IF v_before < v_cost THEN
            RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
        END IF;
        IF (v_wallet.free_monthly_credits - v_wallet.free_monthly_used) >= v_cost THEN
            v_effective_source := 'FREE';
            UPDATE credit_wallets SET free_monthly_used = free_monthly_used + v_cost,
                lifetime_credits_used = lifetime_credits_used + v_cost, updated_at = NOW()
            WHERE user_id = p_user_id RETURNING * INTO v_wallet;
        ELSIF v_wallet.paid_credits >= v_cost THEN
            v_effective_source := 'PAID';
            UPDATE credit_wallets SET paid_credits = paid_credits - v_cost,
                lifetime_credits_used = lifetime_credits_used + v_cost, updated_at = NOW()
            WHERE user_id = p_user_id RETURNING * INTO v_wallet;
        ELSE
            v_effective_source := 'BONUS';
            UPDATE credit_wallets SET bonus_credits = bonus_credits - v_cost,
                lifetime_credits_used = lifetime_credits_used + v_cost, updated_at = NOW()
            WHERE user_id = p_user_id RETURNING * INTO v_wallet;
        END IF;
    ELSIF p_credit_source = 'PAID' THEN
        UPDATE credit_wallets SET paid_credits = paid_credits + p_amount,
            lifetime_credits_purchased = lifetime_credits_purchased + p_amount, updated_at = NOW()
        WHERE user_id = p_user_id RETURNING * INTO v_wallet;
    ELSE
        v_effective_source := 'BONUS';
        UPDATE credit_wallets SET bonus_credits = bonus_credits + p_amount, updated_at = NOW()
        WHERE user_id = p_user_id RETURNING * INTO v_wallet;
    END IF;

    v_after := (v_wallet.free_monthly_credits - v_wallet.free_monthly_used)
             + v_wallet.paid_credits + v_wallet.bonus_credits;
    INSERT INTO credit_ledger (user_id, campaign_id, lead_id, transaction_type, credit_source,
        amount, balance_before, balance_after, description, reference_id, idempotency_key)
    VALUES (p_user_id, p_campaign_id, p_lead_id, p_transaction_type, v_effective_source,
        p_amount, v_before, v_after, p_description, p_reference_id, p_idempotency_key)
    RETURNING * INTO v_ledger;

    RETURN QUERY SELECT to_jsonb(v_wallet), to_jsonb(v_ledger), TRUE;
END;
$$;

REVOKE ALL ON FUNCTION apply_credit_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_credit_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
