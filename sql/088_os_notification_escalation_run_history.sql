-- Escalation check run history (metadata only — no raw bodies or safeguarding narratives)

CREATE TABLE IF NOT EXISTS os_notification_escalation_check_runs (
    id TEXT PRIMARY KEY,
    triggered_by_user_id TEXT,
    triggered_by_name TEXT,
    home_id INTEGER,
    dry_run BOOLEAN NOT NULL DEFAULT TRUE,
    candidate_count INTEGER NOT NULL DEFAULT 0,
    event_count INTEGER NOT NULL DEFAULT 0,
    urgent_count INTEGER NOT NULL DEFAULT 0,
    safeguarding_count INTEGER NOT NULL DEFAULT 0,
    recording_count INTEGER NOT NULL DEFAULT 0,
    isn_count INTEGER NOT NULL DEFAULT 0,
    daily_brief_count INTEGER NOT NULL DEFAULT 0,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_runs_triggered_by
    ON os_notification_escalation_check_runs (triggered_by_user_id);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_runs_home_id
    ON os_notification_escalation_check_runs (home_id);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_runs_dry_run
    ON os_notification_escalation_check_runs (dry_run);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_runs_started
    ON os_notification_escalation_check_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_runs_completed
    ON os_notification_escalation_check_runs (completed_at DESC);
