CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    home_id INTEGER REFERENCES homes(id) ON DELETE SET NULL,
    young_person_id INTEGER REFERENCES young_people(id) ON DELETE SET NULL,
    assistant_type TEXT NOT NULL DEFAULT 'unknown',
    assistant_surface TEXT NOT NULL DEFAULT 'unknown',
    scope_type TEXT,
    prompt TEXT,
    response_preview TEXT,
    response_full TEXT,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_index JSONB NOT NULL DEFAULT '[]'::jsonb,
    regulation_basis JSONB NOT NULL DEFAULT '[]'::jsonb,
    runtime JSONB NOT NULL DEFAULT '{}'::jsonb,
    requires_citations BOOLEAN NOT NULL DEFAULT false,
    defensible_output_contract BOOLEAN NOT NULL DEFAULT false,
    pseudonymised BOOLEAN NOT NULL DEFAULT false,
    safety_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user_created ON ai_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_home_created ON ai_audit_logs(home_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_child_created ON ai_audit_logs(young_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_requires_citations ON ai_audit_logs(requires_citations, created_at DESC);
