-- AI privacy audit events (metadata only — no raw record or prompt text)

CREATE TABLE IF NOT EXISTS ai_privacy_events (
    id TEXT PRIMARY KEY,
    surface TEXT NOT NULL,
    action TEXT NOT NULL,
    decision TEXT NOT NULL,
    user_id TEXT,
    user_role TEXT,
    home_id INTEGER,
    child_id INTEGER,
    staff_id INTEGER,
    output_id TEXT,
    data_classes JSONB NOT NULL DEFAULT '[]'::jsonb,
    sensitivity TEXT,
    redaction_applied BOOLEAN DEFAULT FALSE,
    minimisation_applied BOOLEAN DEFAULT FALSE,
    manager_review_required BOOLEAN DEFAULT FALSE,
    safeguarding_review_required BOOLEAN DEFAULT FALSE,
    export_allowed BOOLEAN,
    model_send_allowed BOOLEAN,
    blocked_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_privacy_surface ON ai_privacy_events (surface);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_action ON ai_privacy_events (action);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_decision ON ai_privacy_events (decision);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_user_id ON ai_privacy_events (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_user_role ON ai_privacy_events (user_role);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_home_id ON ai_privacy_events (home_id);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_child_id ON ai_privacy_events (child_id);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_staff_id ON ai_privacy_events (staff_id);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_sensitivity ON ai_privacy_events (sensitivity);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_manager_review ON ai_privacy_events (manager_review_required);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_safeguarding_review ON ai_privacy_events (safeguarding_review_required);
CREATE INDEX IF NOT EXISTS idx_ai_privacy_created_at ON ai_privacy_events (created_at DESC);
