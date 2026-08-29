-- ==============================================================================
-- Bulk Contact Form Outreach System — Super Admin Database Migration
-- Migration ID: 20260812000001_create_super_admin_schema.sql
-- ==============================================================================

-- 1. App Role Enum for RBAC
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Enhance Users Table with app_role & status
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_role app_role NOT NULL DEFAULT 'USER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_app_role ON users(app_role);

-- 3. System Secrets Storage (AES-256-GCM Encrypted)
CREATE TABLE IF NOT EXISTS system_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = Global system secret
    secret_key VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    masked_preview VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_org_secret_key UNIQUE (organization_id, secret_key)
);

CREATE INDEX IF NOT EXISTS idx_system_secrets_key ON system_secrets(secret_key);

CREATE TRIGGER set_system_secrets_updated_at
BEFORE UPDATE ON system_secrets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Global System Settings & Killswitch
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_live_submissions_enabled BOOLEAN NOT NULL DEFAULT FALSE, -- Safety default: DISABLED
    global_max_concurrency INT NOT NULL DEFAULT 5 CHECK (global_max_concurrency BETWEEN 1 AND 20),
    global_daily_limit INT NOT NULL DEFAULT 500,
    global_default_delay_ms INT NOT NULL DEFAULT 3000,
    global_job_timeout_ms INT NOT NULL DEFAULT 30000,
    resend_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    resend_from_email VARCHAR(255) DEFAULT 'outreach@bulkreach.io',
    resend_from_name VARCHAR(255) DEFAULT 'Outreach Team',
    resend_reply_to VARCHAR(255),
    google_sheets_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    google_client_id TEXT,
    google_redirect_uri TEXT,
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'none',
    ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    ai_max_tokens INT DEFAULT 500,
    ai_temperature NUMERIC(3,2) DEFAULT 0.70,
    session_timeout_minutes INT NOT NULL DEFAULT 60,
    login_rate_limit_per_minute INT NOT NULL DEFAULT 10,
    failed_login_lockout_threshold INT NOT NULL DEFAULT 5,
    lockout_duration_minutes INT NOT NULL DEFAULT 15,
    force_admin_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_ready BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Super Admin Audit Logs (Zero Secret Exposure)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success' | 'failed' | 'blocked'
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- 6. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);

-- ==============================================================================
-- 7. SUPER ADMIN ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE system_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Helper to check if caller is an Admin or Super Admin
CREATE OR REPLACE FUNCTION is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND app_role IN ('ADMIN', 'SUPER_ADMIN')
        AND is_suspended = FALSE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies for Admin Tables
CREATE POLICY admin_secrets_policy ON system_secrets
    FOR ALL USING (is_admin_or_super_admin());

CREATE POLICY admin_settings_policy ON system_settings
    FOR ALL USING (is_admin_or_super_admin());

CREATE POLICY admin_audit_logs_policy ON admin_audit_logs
    FOR ALL USING (is_admin_or_super_admin());

CREATE POLICY admin_reset_tokens_policy ON password_reset_tokens
    FOR ALL USING (is_admin_or_super_admin());
