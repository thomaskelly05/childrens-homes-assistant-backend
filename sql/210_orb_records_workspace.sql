-- Canonical ORB Records Workspace — unified adult-scoped draft/record persistence.
-- Converges standalone saved outputs with planned workspace sections.

CREATE TABLE IF NOT EXISTS orb_records_workspace (
    id TEXT PRIMARY KEY,
    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    home_id TEXT,
    organisation_id TEXT,
    child_id TEXT,
    workspace_section TEXT NOT NULL DEFAULT 'my_drafts',
    category TEXT,
    template_id TEXT,
    source_station TEXT NOT NULL DEFAULT 'manual',
    title TEXT NOT NULL,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    privacy_classification TEXT NOT NULL DEFAULT 'standard',
    retention_policy TEXT NOT NULL DEFAULT 'operational_draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    finalised_at TIMESTAMPTZ,
    exported_at TIMESTAMPTZ,
    audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
    retention_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_orb_records_workspace_owner
    ON orb_records_workspace (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_orb_records_workspace_status
    ON orb_records_workspace (owner_user_id, status);

CREATE INDEX IF NOT EXISTS idx_orb_records_workspace_source
    ON orb_records_workspace (owner_user_id, source_station);

CREATE INDEX IF NOT EXISTS idx_orb_records_workspace_template
    ON orb_records_workspace (owner_user_id, template_id)
    WHERE template_id IS NOT NULL;
