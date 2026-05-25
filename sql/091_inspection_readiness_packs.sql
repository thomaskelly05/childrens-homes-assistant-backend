-- Inspection readiness pack history (metadata-only JSON, no raw bodies)

CREATE TABLE IF NOT EXISTS inspection_readiness_packs (
    id TEXT PRIMARY KEY,
    pack_type TEXT NOT NULL,
    title TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    scope TEXT,
    home_id INTEGER,
    generated_by_user_id TEXT,
    generated_by_name TEXT,
    summary TEXT,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    gap_count INTEGER NOT NULL DEFAULT 0,
    urgent_gap_count INTEGER NOT NULL DEFAULT 0,
    review_required_count INTEGER NOT NULL DEFAULT 0,
    draft_only_count INTEGER NOT NULL DEFAULT 0,
    pack_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    saved_output_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_readiness_packs_pack_type
    ON inspection_readiness_packs (pack_type);
CREATE INDEX IF NOT EXISTS idx_inspection_readiness_packs_home_id
    ON inspection_readiness_packs (home_id);
CREATE INDEX IF NOT EXISTS idx_inspection_readiness_packs_generated_by
    ON inspection_readiness_packs (generated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_readiness_packs_period_start
    ON inspection_readiness_packs (period_start);
CREATE INDEX IF NOT EXISTS idx_inspection_readiness_packs_period_end
    ON inspection_readiness_packs (period_end);
CREATE INDEX IF NOT EXISTS idx_inspection_readiness_packs_status
    ON inspection_readiness_packs (status);
CREATE INDEX IF NOT EXISTS idx_inspection_readiness_packs_created_at
    ON inspection_readiness_packs (created_at DESC);
