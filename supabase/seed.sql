-- ==============================================================================
-- Bulk Contact Form Outreach System — Development Seed Data
-- ==============================================================================

-- 1. Organization & Settings
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Growth Labs', 'acme-growth')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_settings (id, organization_id, default_is_dry_run, max_concurrent_workers, rate_limit_per_minute, global_suppression_domains)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    5,
    10,
    ARRAY['competitor.com', 'internal-corp.net', 'restricted-domain.org']
)
ON CONFLICT (organization_id) DO NOTHING;

-- 2. Message Templates
INSERT INTO message_templates (id, organization_id, name, subject_template, body_template, compliance_footer, is_spintaxEnabled, variables)
VALUES 
(
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Partnership Inquiry v1',
    '{Partnership|Collaboration} with {{company_name}}',
    '{Hi|Hello|Dear} {{first_name}},\n\nI came across {{company_name}} and was really impressed by your work in {{industry}}. We help companies in {{city}} streamline their B2B client acquisition workflows.\n\nWould you be open to a brief introductory call next week?\n\nBest regards,\nAlex Rivera',
    'Sent by Acme Growth Labs, 500 Market St, San Francisco, CA. Reply with STOP to opt out.',
    TRUE,
    ARRAY['company_name', 'first_name', 'industry', 'city']
),
(
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'Vendor Synergies v2',
    'Vendor Synergies with {{company_name}}',
    'Hello {{first_name}},\n\nWe are expanding our vendor network and would love to connect with {{company_name}} regarding upcoming partnership opportunities.\n\nThanks,\nTaylor Smith',
    'Sent by Acme Growth Labs, 500 Market St, San Francisco, CA. Reply with STOP to opt out.',
    FALSE,
    ARRAY['first_name', 'company_name']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Campaigns
INSERT INTO campaigns (id, organization_id, message_template_id, name, status, is_dry_run, total_leads, processed_leads, successful_submissions, review_required_leads, blocked_leads, failed_leads, rate_limit_per_minute, max_concurrency, started_at)
VALUES 
(
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'Q3 Enterprise SaaS Outreach',
    'running',
    TRUE,
    500,
    320,
    260,
    42,
    12,
    6,
    12,
    5,
    NOW() - INTERVAL '4 hours'
),
(
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    'Logistics & Supply Chain Tier-1',
    'completed',
    TRUE,
    450,
    450,
    390,
    38,
    15,
    7,
    10,
    4,
    NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Leads
INSERT INTO leads (id, organization_id, domain, website, company_name, first_name, last_name, email, phone, industry, city, country, status)
VALUES 
(
    '00000000-0000-0000-0000-000000001001',
    '00000000-0000-0000-0000-000000000001',
    'stripe.com',
    'https://stripe.com',
    'Stripe, Inc.',
    'Patrick',
    'Collison',
    'contact@stripe.com',
    '+1 888-926-2289',
    'Financial Services',
    'San Francisco',
    'United States',
    'DRY_RUN_COMPLETED'
),
(
    '00000000-0000-0000-0000-000000001002',
    '00000000-0000-0000-0000-000000000001',
    'cloudflare.com',
    'https://cloudflare.com',
    'Cloudflare',
    'Matthew',
    'Prince',
    'inquiry@cloudflare.com',
    '+1 888-993-4732',
    'Cybersecurity',
    'Austin',
    'United States',
    'REVIEW_REQUIRED'
),
(
    '00000000-0000-0000-0000-000000001003',
    '00000000-0000-0000-0000-000000000001',
    'linear.app',
    'https://linear.app',
    'Linear',
    'Karri',
    'Saarinen',
    'support@linear.app',
    NULL,
    'Productivity Software',
    'San Francisco',
    'United States',
    'SUBMITTED'
)
ON CONFLICT (id) DO NOTHING;
