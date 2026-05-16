CREATE TABLE IF NOT EXISTS operational_lifecycle_history (
    id BIGSERIAL PRIMARY KEY,
    provider_id INTEGER NULL,
    home_id INTEGER NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    actor_id INTEGER NULL,
    correlation_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    next_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    transition_type TEXT NULL,
    escalation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    signoff_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    chronology_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    governance_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    replay_references JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS operational_audit_timeline (LIKE operational_lifecycle_history INCLUDING ALL);
CREATE TABLE IF NOT EXISTS operational_event_log (LIKE operational_lifecycle_history INCLUDING ALL);
CREATE TABLE IF NOT EXISTS governance_signoff_history (LIKE operational_lifecycle_history INCLUDING ALL);
CREATE TABLE IF NOT EXISTS evidence_relationship_history (LIKE operational_lifecycle_history INCLUDING ALL);
CREATE TABLE IF NOT EXISTS chronology_snapshot_history (LIKE operational_lifecycle_history INCLUDING ALL);

CREATE INDEX IF NOT EXISTS idx_operational_lifecycle_history_scope ON operational_lifecycle_history (provider_id, home_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_audit_timeline_scope ON operational_audit_timeline (provider_id, home_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_event_log_scope ON operational_event_log (provider_id, home_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_signoff_history_scope ON governance_signoff_history (provider_id, home_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_relationship_history_scope ON evidence_relationship_history (provider_id, home_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chronology_snapshot_history_scope ON chronology_snapshot_history (provider_id, home_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_event_log_correlation ON operational_event_log (correlation_id);
CREATE INDEX IF NOT EXISTS idx_operational_audit_timeline_correlation ON operational_audit_timeline (correlation_id);
