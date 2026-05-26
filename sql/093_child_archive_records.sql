-- Signed-off child archive (safe summaries only — no raw record bodies)
CREATE TABLE IF NOT EXISTS child_archive_records (
    id TEXT PRIMARY KEY,
    child_id INTEGER NOT NULL,
    home_id INTEGER,
    title TEXT NOT NULL,
    safe_summary TEXT,
    record_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    source_route TEXT,
    event_date DATE,
    recorded_at TIMESTAMPTZ,
    signed_off_at TIMESTAMPTZ,
    signed_off_by_user_id TEXT,
    signed_off_by_name TEXT,
    author_user_id TEXT,
    author_name TEXT,
    author_role TEXT,
    manager_review_required BOOLEAN NOT NULL DEFAULT FALSE,
    safeguarding_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    chronology_event_id TEXT,
    lifeecho_memory_id TEXT,
    plan_impact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'signed_off',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_archive_child_id ON child_archive_records (child_id);
CREATE INDEX IF NOT EXISTS idx_child_archive_home_id ON child_archive_records (home_id);
CREATE INDEX IF NOT EXISTS idx_child_archive_record_type ON child_archive_records (record_type);
CREATE INDEX IF NOT EXISTS idx_child_archive_source_type ON child_archive_records (source_type);
CREATE INDEX IF NOT EXISTS idx_child_archive_source_id ON child_archive_records (source_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_child_archive_source_unique
    ON child_archive_records (source_type, source_id)
    WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_child_archive_event_date ON child_archive_records (event_date);
CREATE INDEX IF NOT EXISTS idx_child_archive_signed_off_at ON child_archive_records (signed_off_at);
CREATE INDEX IF NOT EXISTS idx_child_archive_author_user_id ON child_archive_records (author_user_id);
CREATE INDEX IF NOT EXISTS idx_child_archive_signed_off_by ON child_archive_records (signed_off_by_user_id);
CREATE INDEX IF NOT EXISTS idx_child_archive_status ON child_archive_records (status);
CREATE INDEX IF NOT EXISTS idx_child_archive_tags ON child_archive_records USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_child_archive_metadata ON child_archive_records USING GIN (metadata);

CREATE TABLE IF NOT EXISTS plan_impact_suggestions (
    id TEXT PRIMARY KEY,
    child_id INTEGER NOT NULL,
    home_id INTEGER,
    source_type TEXT NOT NULL,
    source_id TEXT,
    archive_record_id TEXT,
    suggested_plan_type TEXT NOT NULL,
    title TEXT NOT NULL,
    safe_summary TEXT,
    suggested_update TEXT,
    evidence_date DATE,
    risk_level TEXT,
    review_required BOOLEAN NOT NULL DEFAULT TRUE,
    manager_review_required BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_by_user_id TEXT,
    accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'suggested',
    route TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_impact_child_id ON plan_impact_suggestions (child_id);
CREATE INDEX IF NOT EXISTS idx_plan_impact_status ON plan_impact_suggestions (status);
CREATE INDEX IF NOT EXISTS idx_plan_impact_archive ON plan_impact_suggestions (archive_record_id);

CREATE TABLE IF NOT EXISTS lifeecho_memory_suggestions (
    id TEXT PRIMARY KEY,
    child_id INTEGER NOT NULL,
    home_id INTEGER,
    title TEXT NOT NULL,
    safe_summary TEXT,
    kind TEXT NOT NULL DEFAULT 'positive_moment',
    archive_record_id TEXT,
    source_type TEXT,
    source_id TEXT,
    status TEXT NOT NULL DEFAULT 'suggested',
    review_required BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lifeecho_memories (
    id TEXT PRIMARY KEY,
    child_id INTEGER NOT NULL,
    home_id INTEGER,
    title TEXT NOT NULL,
    safe_summary TEXT,
    kind TEXT NOT NULL DEFAULT 'positive_moment',
    status TEXT NOT NULL DEFAULT 'approved',
    archive_record_id TEXT,
    photo_path TEXT,
    event_date DATE,
    created_by_user_id TEXT,
    created_by_name TEXT,
    approved_by_user_id TEXT,
    approved_at TIMESTAMPTZ,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeecho_memories_child ON lifeecho_memories (child_id);
CREATE INDEX IF NOT EXISTS idx_lifeecho_suggestions_child ON lifeecho_memory_suggestions (child_id);
