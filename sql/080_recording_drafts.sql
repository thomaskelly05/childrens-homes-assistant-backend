-- Operational OS recording workspace drafts (not standalone ORB artefacts)

CREATE TABLE IF NOT EXISTS recording_drafts (
    id TEXT PRIMARY KEY,
    title TEXT,
    body TEXT,
    recording_type TEXT NOT NULL,
    form_id TEXT,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    review_status TEXT NOT NULL DEFAULT 'not_required',
    child_id INTEGER,
    child_name TEXT,
    home_id INTEGER,
    staff_id INTEGER,
    context_type TEXT,
    created_by_user_id TEXT,
    created_by_name TEXT,
    created_by_role TEXT,
    manager_review_required BOOLEAN DEFAULT FALSE,
    safeguarding_review_required BOOLEAN DEFAULT FALSE,
    privacy_sensitive BOOLEAN DEFAULT FALSE,
    safeguarding_sensitive BOOLEAN DEFAULT FALSE,
    quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    language_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    privacy_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    checklist_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    privacy_guard JSONB NOT NULL DEFAULT '{}'::jsonb,
    redaction_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    minimisation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    linked_record_id TEXT,
    linked_chronology_id TEXT,
    submitted_to TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recording_drafts_created_by_user_id ON recording_drafts (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_child_id ON recording_drafts (child_id);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_home_id ON recording_drafts (home_id);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_recording_type ON recording_drafts (recording_type);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_status ON recording_drafts (status);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_review_status ON recording_drafts (review_status);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_manager_review_required ON recording_drafts (manager_review_required);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_safeguarding_review_required ON recording_drafts (safeguarding_review_required);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_updated_at ON recording_drafts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recording_drafts_created_at ON recording_drafts (created_at DESC);
