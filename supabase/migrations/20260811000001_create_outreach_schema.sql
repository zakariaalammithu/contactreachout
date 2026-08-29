-- ==============================================================================
-- Bulk Contact Form Outreach System — Comprehensive Database Migration
-- Migration ID: 20260811000001_create_outreach_schema.sql
-- ==============================================================================

-- Enable UUID & Crypto Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMERATED TYPES (ENUMS)
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'operator', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM (
        'draft',
        'scheduled',
        'running',
        'paused',
        'completed',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'PENDING',
        'QUEUED',
        'PROCESSING',
        'CONTACT_PAGE_FOUND',
        'FORM_DETECTED',
        'DRY_RUN_COMPLETED',
        'SUBMITTED',
        'REVIEW_REQUIRED',
        'BLOCKED',
        'FAILED',
        'SKIPPED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE form_field_type AS ENUM (
        'first_name',
        'last_name',
        'full_name',
        'email',
        'phone',
        'company',
        'website',
        'subject',
        'message',
        'consent_checkbox',
        'custom',
        'honeypot',
        'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submission_status AS ENUM (
        'SUCCESS',
        'DRY_RUN_SUCCESS',
        'CAPTCHA_TRIGGERED',
        'VALIDATION_ERROR',
        'BLOCKED_403_429',
        'TIMEOUT',
        'SERVER_ERROR',
        'AMBIGUOUS_OUTCOME'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE screenshot_type AS ENUM (
        'pre_submit',
        'post_submit',
        'error_state',
        'captcha_state',
        'manual_review'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CORE ENTITY TABLES
-- ==============================================================================

-- 3.1 Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3.2 Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'operator',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3.3 User & Organization Settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    default_is_dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    max_concurrent_workers INT NOT NULL DEFAULT 5 CHECK (max_concurrent_workers BETWEEN 1 AND 50),
    rate_limit_per_minute INT NOT NULL DEFAULT 10 CHECK (rate_limit_per_minute BETWEEN 1 AND 120),
    inter_page_delay_ms INT NOT NULL DEFAULT 3000 CHECK (inter_page_delay_ms >= 1000),
    page_navigation_timeout_ms INT NOT NULL DEFAULT 30000,
    form_detection_timeout_ms INT NOT NULL DEFAULT 10000,
    global_suppression_domains TEXT[] NOT NULL DEFAULT '{}',
    global_suppression_emails TEXT[] NOT NULL DEFAULT '{}',
    webhook_url TEXT,
    webhook_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3.4 Message Templates
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    compliance_footer TEXT NOT NULL,
    is_spintax_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    variables TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_org ON message_templates(organization_id);

CREATE TRIGGER set_message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3.5 Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    message_template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    status campaign_status NOT NULL DEFAULT 'draft',
    is_dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    total_leads INT NOT NULL DEFAULT 0,
    processed_leads INT NOT NULL DEFAULT 0,
    successful_submissions INT NOT NULL DEFAULT 0,
    review_required_leads INT NOT NULL DEFAULT 0,
    blocked_leads INT NOT NULL DEFAULT 0,
    failed_leads INT NOT NULL DEFAULT 0,
    rate_limit_per_minute INT NOT NULL DEFAULT 10,
    max_concurrency INT NOT NULL DEFAULT 5,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org_status ON campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_template ON campaigns(message_template_id);

CREATE TRIGGER set_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3.6 Leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    website VARCHAR(1024) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    industry VARCHAR(100),
    city VARCHAR(100),
    country VARCHAR(100),
    custom_fields JSONB NOT NULL DEFAULT '{}',
    status lead_status NOT NULL DEFAULT 'PENDING',
    source_filename VARCHAR(255),
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_org_domain ON leads(organization_id, domain);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON leads USING GIN (custom_fields);

CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3.7 Contact Pages
CREATE TABLE IF NOT EXISTS contact_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    url VARCHAR(1024) NOT NULL,
    discovery_method VARCHAR(50) NOT NULL, -- 'homepage_anchor', 'path_probe', 'homepage_embedded'
    http_status_code INT,
    page_title TEXT,
    has_contact_form BOOLEAN NOT NULL DEFAULT FALSE,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_pages_lead ON contact_pages(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_pages_form ON contact_pages(has_contact_form);

-- 3.8 Contact Forms
CREATE TABLE IF NOT EXISTS contact_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_page_id UUID NOT NULL REFERENCES contact_pages(id) ON DELETE CASCADE,
    form_selector VARCHAR(255) NOT NULL,
    is_in_iframe BOOLEAN NOT NULL DEFAULT FALSE,
    iframe_src VARCHAR(1024),
    form_action VARCHAR(1024),
    form_method VARCHAR(10) DEFAULT 'POST',
    confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    has_honeypot BOOLEAN NOT NULL DEFAULT FALSE,
    has_captcha_challenge BOOLEAN NOT NULL DEFAULT FALSE,
    captcha_type VARCHAR(50), -- 'recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'turnstile'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_forms_page ON contact_forms(contact_page_id);

-- 3.9 Form Fields
CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_form_id UUID NOT NULL REFERENCES contact_forms(id) ON DELETE CASCADE,
    element_tag VARCHAR(50) NOT NULL, -- 'input', 'textarea', 'select'
    input_type VARCHAR(50),           -- 'text', 'email', 'tel', 'checkbox', 'hidden'
    field_name VARCHAR(255),
    field_id VARCHAR(255),
    field_placeholder TEXT,
    field_label TEXT,
    css_selector VARCHAR(255) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_honeypot BOOLEAN NOT NULL DEFAULT FALSE,
    mapped_semantic_type form_field_type NOT NULL DEFAULT 'unknown',
    match_confidence NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_fields_form ON form_fields(contact_form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_semantic ON form_fields(mapped_semantic_type);

-- 3.10 Processing Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    bullmq_job_id VARCHAR(255) UNIQUE,
    queue_name VARCHAR(100) NOT NULL DEFAULT 'outreach-execution',
    status job_status NOT NULL DEFAULT 'waiting',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 2,
    lock_expires_at TIMESTAMPTZ,
    worker_id VARCHAR(255),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_campaign_status ON jobs(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_lead ON jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_bullmq ON jobs(bullmq_job_id);

-- 3.11 Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contact_form_id UUID REFERENCES contact_forms(id) ON DELETE SET NULL,
    status submission_status NOT NULL,
    lead_status lead_status NOT NULL,
    is_dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    submitted_payload JSONB NOT NULL DEFAULT '{}',
    http_response_status INT,
    error_code VARCHAR(100),
    error_message TEXT,
    manual_review_notes TEXT,
    resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_campaign_status ON submissions(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_lead ON submissions(lead_id);
CREATE INDEX IF NOT EXISTS idx_submissions_lead_status ON submissions(lead_status);

-- 3.12 Submission Logs (Telemetry & Auditing)
CREATE TABLE IF NOT EXISTS submission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    duration_ms INT,
    context JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_logs_sub ON submission_logs(submission_id);

-- 3.13 Screenshots (Visual Proof Storage)
CREATE TABLE IF NOT EXISTS screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    type screenshot_type NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INT,
    dimensions_width INT DEFAULT 1280,
    dimensions_height INT DEFAULT 800,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_sub ON screenshots(submission_id);

-- ==============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) ENFORCEMENT
-- ==============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION get_auth_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Organization Policies
CREATE POLICY org_access ON organizations
    FOR ALL USING (id = get_auth_organization_id());

-- Users Policies
CREATE POLICY user_access ON users
    FOR ALL USING (organization_id = get_auth_organization_id());

-- Settings Policies
CREATE POLICY settings_access ON user_settings
    FOR ALL USING (organization_id = get_auth_organization_id());

-- Message Templates Policies
CREATE POLICY templates_access ON message_templates
    FOR ALL USING (organization_id = get_auth_organization_id());

-- Campaigns Policies
CREATE POLICY campaigns_access ON campaigns
    FOR ALL USING (organization_id = get_auth_organization_id());

-- Leads Policies
CREATE POLICY leads_access ON leads
    FOR ALL USING (organization_id = get_auth_organization_id());

-- Contact Pages Policies (via Leads)
CREATE POLICY contact_pages_access ON contact_pages
    FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_auth_organization_id()));

-- Contact Forms Policies (via Contact Pages -> Leads)
CREATE POLICY contact_forms_access ON contact_forms
    FOR ALL USING (contact_page_id IN (
        SELECT cp.id FROM contact_pages cp
        JOIN leads l ON cp.lead_id = l.id
        WHERE l.organization_id = get_auth_organization_id()
    ));

-- Form Fields Policies (via Contact Forms -> Contact Pages -> Leads)
CREATE POLICY form_fields_access ON form_fields
    FOR ALL USING (contact_form_id IN (
        SELECT cf.id FROM contact_forms cf
        JOIN contact_pages cp ON cf.contact_page_id = cp.id
        JOIN leads l ON cp.lead_id = l.id
        WHERE l.organization_id = get_auth_organization_id()
    ));

-- Jobs Policies (via Campaigns)
CREATE POLICY jobs_access ON jobs
    FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE organization_id = get_auth_organization_id()));

-- Submissions Policies (via Campaigns)
CREATE POLICY submissions_access ON submissions
    FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE organization_id = get_auth_organization_id()));

-- Submission Logs Policies (via Submissions -> Campaigns)
CREATE POLICY logs_access ON submission_logs
    FOR ALL USING (submission_id IN (
        SELECT s.id FROM submissions s
        JOIN campaigns c ON s.campaign_id = c.id
        WHERE c.organization_id = get_auth_organization_id()
    ));

-- Screenshots Policies (via Submissions -> Campaigns)
CREATE POLICY screenshots_access ON screenshots
    FOR ALL USING (submission_id IN (
        SELECT s.id FROM submissions s
        JOIN campaigns c ON s.campaign_id = c.id
        WHERE c.organization_id = get_auth_organization_id()
    ));
