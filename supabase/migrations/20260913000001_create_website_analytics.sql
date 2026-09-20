-- Website visitor analytics storage.
-- Browser identifiers are always SHA-256 hashes and never raw values.

CREATE TABLE IF NOT EXISTS website_analytics_visitors (
    id TEXT PRIMARY KEY,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_analytics_sessions (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL REFERENCES website_analytics_visitors(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    source TEXT NOT NULL DEFAULT 'Direct',
    country TEXT,
    device TEXT NOT NULL DEFAULT 'Unknown',
    browser TEXT NOT NULL DEFAULT 'Other'
);

CREATE TABLE IF NOT EXISTS website_analytics_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES website_analytics_sessions(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    engagement_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_website_visitors_first_seen ON website_analytics_visitors(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_website_sessions_started_at ON website_analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_website_sessions_last_seen ON website_analytics_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_website_sessions_country ON website_analytics_sessions(country);
CREATE INDEX IF NOT EXISTS idx_website_sessions_source ON website_analytics_sessions(source);
CREATE INDEX IF NOT EXISTS idx_website_page_views_viewed_at ON website_analytics_page_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_website_page_views_path ON website_analytics_page_views(path);
CREATE INDEX IF NOT EXISTS idx_website_page_views_session ON website_analytics_page_views(session_id);

-- Service-role access only. No anon/authenticated policies are intentionally created.
ALTER TABLE website_analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics_page_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION purge_website_analytics(retention_days INTEGER DEFAULT 730)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF retention_days < 30 THEN
        RAISE EXCEPTION 'Analytics retention must be at least 30 days';
    END IF;

    DELETE FROM website_analytics_visitors
    WHERE last_seen_at < NOW() - (retention_days || ' days')::interval;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
