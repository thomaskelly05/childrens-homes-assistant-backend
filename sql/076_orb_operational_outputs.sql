-- OS-linked operational ORB outputs (briefings, reviews, action plans).
-- Not exposed to standalone /orb; separate from orb_saved_outputs.

CREATE TABLE IF NOT EXISTS orb_operational_outputs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'saved',
    review_status TEXT NOT NULL DEFAULT 'not_required',
    visibility TEXT NOT NULL DEFAULT 'operational_private',
    home_id INTEGER,
    child_id INTEGER,
    staff_id INTEGER,
    provider_id INTEGER,
    created_by_user_id TEXT,
    created_by_name TEXT,
    created_by_role TEXT,
    scope_label TEXT,
    summary TEXT,
    content_markdown TEXT,
    content_json JSONB NOT NULL DEFAULT '{}',
    intelligence_output JSONB NOT NULL DEFAULT '{}',
    context_cards JSONB NOT NULL DEFAULT '[]',
    evidence_items JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    draft_actions JSONB NOT NULL DEFAULT '[]',
    review_prompts JSONB NOT NULL DEFAULT '[]',
    sources JSONB NOT NULL DEFAULT '[]',
    citations JSONB NOT NULL DEFAULT '[]',
    evaluation JSONB NOT NULL DEFAULT '{}',
    model_routing JSONB NOT NULL DEFAULT '{}',
    retrieval_context JSONB NOT NULL DEFAULT '{}',
    audit_reference TEXT,
    linked_action_ids JSONB NOT NULL DEFAULT '[]',
    linked_review_ids JSONB NOT NULL DEFAULT '[]',
    tags JSONB NOT NULL DEFAULT '[]',
    priority TEXT,
    created_from TEXT,
    standalone_only BOOLEAN NOT NULL DEFAULT FALSE,
    os_linked BOOLEAN NOT NULL DEFAULT TRUE,
    permissioned_context BOOLEAN NOT NULL DEFAULT TRUE,
    care_record_access BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_home_id ON orb_operational_outputs (home_id);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_child_id ON orb_operational_outputs (child_id);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_staff_id ON orb_operational_outputs (staff_id);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_type ON orb_operational_outputs (type);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_status ON orb_operational_outputs (status);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_review_status ON orb_operational_outputs (review_status);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_visibility ON orb_operational_outputs (visibility);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_created_at ON orb_operational_outputs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_created_by ON orb_operational_outputs (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_tags ON orb_operational_outputs USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_orb_operational_outputs_linked_actions ON orb_operational_outputs USING GIN (linked_action_ids);

COMMENT ON TABLE orb_operational_outputs IS 'OS-linked operational ORB artefacts; permissioned and auditable; not standalone saved outputs.';
