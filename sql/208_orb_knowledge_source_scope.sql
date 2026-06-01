-- Knowledge source privacy scope for ORB Residential RBAC.

ALTER TABLE orb_knowledge_sources
    ADD COLUMN IF NOT EXISTS source_scope TEXT;

ALTER TABLE orb_knowledge_sources
    ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE orb_knowledge_sources
    ADD COLUMN IF NOT EXISTS organisation_id INTEGER;

UPDATE orb_knowledge_sources
SET source_scope = CASE
    WHEN origin IN ('seeded', 'built_in', 'builtin') THEN 'global_builtin'
    WHEN governance_status = 'approved' AND COALESCE(official_source, FALSE) THEN 'global_admin_approved'
    WHEN uploaded_by_user_id IS NOT NULL AND uploaded_by_user_id <> '' THEN 'user_private'
    ELSE COALESCE(source_scope, 'global_builtin')
END
WHERE source_scope IS NULL;

CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_scope
    ON orb_knowledge_sources(source_scope);

CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_owner_user
    ON orb_knowledge_sources(owner_user_id);
