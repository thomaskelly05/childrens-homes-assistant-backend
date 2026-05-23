-- IndiCare Intelligence AI governance events (metadata only, no raw care record bodies)

CREATE TABLE IF NOT EXISTS indicare_ai_governance_events (
    id TEXT PRIMARY KEY,
    surface TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id TEXT,
    user_role TEXT,
    home_id INTEGER,
    child_id INTEGER,
    staff_id INTEGER,
    output_id TEXT,
    action_id TEXT,
    source_id TEXT,
    model_provider TEXT,
    model_name TEXT,
    task_type TEXT,
    quality_tier TEXT,
    cost_tier TEXT,
    latency_ms INTEGER,
    fallback_used BOOLEAN DEFAULT FALSE,
    evaluation_score NUMERIC,
    citation_count INTEGER DEFAULT 0,
    official_source_count INTEGER DEFAULT 0,
    summary_only_source_count INTEGER DEFAULT 0,
    safety_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    boundary_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_level TEXT DEFAULT 'info',
    message_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_surface ON indicare_ai_governance_events (surface);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_event_type ON indicare_ai_governance_events (event_type);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_user_id ON indicare_ai_governance_events (user_id);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_home_id ON indicare_ai_governance_events (home_id);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_output_id ON indicare_ai_governance_events (output_id);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_source_id ON indicare_ai_governance_events (source_id);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_risk_level ON indicare_ai_governance_events (risk_level);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_created_at ON indicare_ai_governance_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_model_provider ON indicare_ai_governance_events (model_provider);
CREATE INDEX IF NOT EXISTS idx_indicare_ai_gov_task_type ON indicare_ai_governance_events (task_type);
