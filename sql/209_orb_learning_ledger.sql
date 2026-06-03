-- ORB 9 learning ledger — anonymised sector learning, no child identifiers.

CREATE TABLE IF NOT EXISTS orb_learning_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_role TEXT,
    prompt_summary TEXT NOT NULL,
    intent TEXT,
    active_brains JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_level TEXT,
    source_basis JSONB NOT NULL DEFAULT '[]'::jsonb,
    answer_quality_score NUMERIC(5, 2),
    missing_markers JSONB NOT NULL DEFAULT '[]'::jsonb,
    follow_up_classification TEXT,
    user_feedback TEXT,
    copied BOOLEAN NOT NULL DEFAULT FALSE,
    exported BOOLEAN NOT NULL DEFAULT FALSE,
    record_created BOOLEAN NOT NULL DEFAULT FALSE,
    answer_regenerated BOOLEAN NOT NULL DEFAULT FALSE,
    manager_amended BOOLEAN NOT NULL DEFAULT FALSE,
    learning_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_learning_ledger_created_at ON orb_learning_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_orb_learning_ledger_intent ON orb_learning_ledger(intent);
CREATE INDEX IF NOT EXISTS idx_orb_learning_ledger_risk_level ON orb_learning_ledger(risk_level);
