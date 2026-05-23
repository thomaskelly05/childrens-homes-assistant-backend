-- Standalone ORB saved intelligence outputs (project artefacts; not OS records)

CREATE TABLE IF NOT EXISTS orb_saved_outputs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'saved',
    project_id TEXT,
    project_name TEXT,
    profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    content_markdown TEXT,
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    intelligence_output JSONB NOT NULL DEFAULT '{}'::jsonb,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    quality JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_routing JSONB NOT NULL DEFAULT '{}'::jsonb,
    retrieval_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_from TEXT,
    created_from_id TEXT,
    standalone_only BOOLEAN NOT NULL DEFAULT TRUE,
    os_linked BOOLEAN NOT NULL DEFAULT FALSE,
    care_record_access BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_project_id ON orb_saved_outputs (project_id);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_type ON orb_saved_outputs (type);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_status ON orb_saved_outputs (status);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_created_at ON orb_saved_outputs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_tags ON orb_saved_outputs USING GIN (tags);
