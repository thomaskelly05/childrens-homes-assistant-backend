-- Recording alert check runs — manual/health metadata only (no raw bodies)
CREATE TABLE IF NOT EXISTS recording_alert_check_runs (
    id text PRIMARY KEY,
    triggered_by_user_id text,
    triggered_by_name text,
    home_id integer,
    scope text NOT NULL DEFAULT 'provider',
    dry_run boolean NOT NULL DEFAULT false,
    generated integer NOT NULL DEFAULT 0,
    created integer NOT NULL DEFAULT 0,
    updated integer NOT NULL DEFAULT 0,
    skipped integer NOT NULL DEFAULT 0,
    warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_recording_alert_check_runs_completed
    ON recording_alert_check_runs (completed_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_recording_alert_check_runs_triggered_by
    ON recording_alert_check_runs (triggered_by_user_id);
