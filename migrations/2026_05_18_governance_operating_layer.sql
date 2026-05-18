BEGIN;

CREATE TABLE IF NOT EXISTS governance_reg44_visits (
    id BIGSERIAL PRIMARY KEY,
    home_id BIGINT,
    provider_id BIGINT,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    actioned_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    visitor_name TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'reviewed', 'actioned', 'closed')),
    evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    provider_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    orb_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_reg44_visits_home_status
    ON governance_reg44_visits (home_id, status);

CREATE INDEX IF NOT EXISTS idx_governance_reg44_visits_provider
    ON governance_reg44_visits (provider_id);

CREATE TABLE IF NOT EXISTS governance_intelligence_snapshots (
    id BIGSERIAL PRIMARY KEY,
    home_id BIGINT,
    provider_id BIGINT,
    snapshot_type TEXT NOT NULL,
    risk_level TEXT,
    risk_score INTEGER,
    evidence_gap_count INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_intelligence_snapshots_home_type
    ON governance_intelligence_snapshots (home_id, snapshot_type, created_at DESC);

CREATE TABLE IF NOT EXISTS governance_evidence_matrix_links (
    id BIGSERIAL PRIMARY KEY,
    home_id BIGINT,
    provider_id BIGINT,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    evidence_quality TEXT,
    route TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_evidence_matrix_node
    ON governance_evidence_matrix_links (node_id, source_type, source_id);

COMMIT;
