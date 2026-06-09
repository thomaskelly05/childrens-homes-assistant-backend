-- Founder OS persistence V1 — private founder/admin system of record.
-- No child, staff or provider operational data.

CREATE TABLE IF NOT EXISTS founder_os_records (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT,
    created_by TEXT NOT NULL DEFAULT 'founder',
    source TEXT NOT NULL DEFAULT 'founder-ui',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_os_records_entity_type
    ON founder_os_records (entity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_records_status
    ON founder_os_records (entity_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_records_user
    ON founder_os_records (user_id, entity_type, created_at DESC);

CREATE TABLE IF NOT EXISTS founder_os_audit_log (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    actor TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    linked_entity_id TEXT,
    linked_entity_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_os_audit_log_created
    ON founder_os_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_audit_log_entity
    ON founder_os_audit_log (entity_type, created_at DESC);
