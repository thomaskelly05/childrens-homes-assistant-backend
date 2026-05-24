-- Recording alerts and manager follow-up workflow (metadata-only)

CREATE TABLE IF NOT EXISTS recording_alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    title TEXT NOT NULL,
    description TEXT,
    safe_summary TEXT,
    draft_id TEXT,
    review_event_id TEXT,
    child_id INTEGER,
    child_name TEXT,
    home_id INTEGER,
    recording_type TEXT,
    form_id TEXT,
    source TEXT,
    route TEXT,
    action_label TEXT,
    owner_user_id TEXT,
    owner_name TEXT,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    linked_action_id TEXT,
    due_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recording_alerts_alert_type ON recording_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_severity ON recording_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_status ON recording_alerts (status);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_draft_id ON recording_alerts (draft_id);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_child_id ON recording_alerts (child_id);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_home_id ON recording_alerts (home_id);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_recording_type ON recording_alerts (recording_type);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_form_id ON recording_alerts (form_id);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_owner_user_id ON recording_alerts (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_due_at ON recording_alerts (due_at);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_created_at ON recording_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recording_alerts_updated_at ON recording_alerts (updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recording_alerts_dedupe_open
    ON recording_alerts (alert_type, draft_id)
    WHERE status IN ('open', 'acknowledged', 'assigned') AND draft_id IS NOT NULL;
