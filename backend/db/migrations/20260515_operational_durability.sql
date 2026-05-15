-- Operational durability, document persistence, export queues and Orb session state.
-- Down migration, where practical:
-- DROP TABLE IF EXISTS audit_replay_cursors, operational_metrics, upload_processing_jobs,
-- export_processing_jobs, operational_queue_items, document_retention_policies,
-- document_instance_autosaves, document_instance_versions, document_instances,
-- orb_realtime_sessions CASCADE;

CREATE TABLE IF NOT EXISTS operational_queue_items (
    queue_id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_by TEXT NULL,
    locked_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operational_queue_due ON operational_queue_items (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_operational_queue_scope ON operational_queue_items (scope, operation_type);

CREATE TABLE IF NOT EXISTS export_processing_jobs (
    export_id TEXT PRIMARY KEY,
    queue_id TEXT REFERENCES operational_queue_items(queue_id) ON DELETE SET NULL,
    export_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    requested_by INTEGER NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    artifact JSONB NOT NULL DEFAULT '{}'::jsonb,
    error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_export_processing_jobs_scope ON export_processing_jobs (scope, status, created_at DESC);

CREATE TABLE IF NOT EXISTS upload_processing_jobs (
    upload_id TEXT PRIMARY KEY,
    queue_id TEXT REFERENCES operational_queue_items(queue_id) ON DELETE SET NULL,
    scope TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    retention_until TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    processing_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upload_processing_jobs_scope ON upload_processing_jobs (scope, status, created_at DESC);

CREATE TABLE IF NOT EXISTS operational_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    request_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operational_metrics_name_created ON operational_metrics (metric_name, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_replay_cursors (
    replay_name TEXT PRIMARY KEY,
    last_audit_event_id BIGINT NOT NULL DEFAULT 0,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_instances (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL,
    child_id TEXT NULL,
    home_id TEXT NULL,
    staff_id TEXT NULL,
    provider_id TEXT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    links JSONB NOT NULL DEFAULT '[]'::jsonb,
    review JSONB NOT NULL DEFAULT '{}'::jsonb,
    signatures JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_instances_scope ON document_instances (scope, child_id, home_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_document_instances_status ON document_instances (status);

CREATE TABLE IF NOT EXISTS document_instance_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES document_instances(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    created_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_instance_versions_doc ON document_instance_versions (document_id, version_number DESC);

CREATE TABLE IF NOT EXISTS document_instance_autosaves (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES document_instances(id) ON DELETE CASCADE,
    envelope JSONB NOT NULL,
    created_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_instance_autosaves_doc ON document_instance_autosaves (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_retention_policies (
    id BIGSERIAL PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES document_instances(id) ON DELETE CASCADE,
    retention_until TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    created_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_retention_until ON document_retention_policies (retention_until);

CREATE TABLE IF NOT EXISTS orb_realtime_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    home_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    realtime_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    websocket_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orb_realtime_sessions_user ON orb_realtime_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_realtime_sessions_home ON orb_realtime_sessions(home_id);
CREATE INDEX IF NOT EXISTS idx_orb_realtime_sessions_expiry ON orb_realtime_sessions(expires_at);
