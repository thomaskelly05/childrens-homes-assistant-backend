-- Founder OS telemetry — anonymised operational platform events (founder/admin analytics only).

CREATE TABLE IF NOT EXISTS founder_os_telemetry_events (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT NOT NULL,
    route TEXT,
    user_role TEXT,
    session_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_os_telemetry_event_type
    ON founder_os_telemetry_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_telemetry_category
    ON founder_os_telemetry_events (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_telemetry_created
    ON founder_os_telemetry_events (created_at DESC);
