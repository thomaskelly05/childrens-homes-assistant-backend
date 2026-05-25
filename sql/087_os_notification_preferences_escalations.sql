-- OS notification preferences and escalation foundation (metadata only — no raw bodies)

CREATE TABLE IF NOT EXISTS os_notification_preferences (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    scope_id TEXT,
    role TEXT,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_severity TEXT NOT NULL DEFAULT 'low',
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    urgent_override BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start TEXT,
    quiet_hours_end TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_notification_preferences_scope
    ON os_notification_preferences (scope);

CREATE INDEX IF NOT EXISTS idx_os_notification_preferences_scope_id
    ON os_notification_preferences (scope_id);

CREATE INDEX IF NOT EXISTS idx_os_notification_preferences_role
    ON os_notification_preferences (role);

CREATE INDEX IF NOT EXISTS idx_os_notification_preferences_source
    ON os_notification_preferences (source);

CREATE INDEX IF NOT EXISTS idx_os_notification_preferences_category
    ON os_notification_preferences (category);

CREATE INDEX IF NOT EXISTS idx_os_notification_preferences_enabled
    ON os_notification_preferences (enabled);

CREATE TABLE IF NOT EXISTS os_notification_escalation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    min_severity TEXT NOT NULL DEFAULT 'high',
    status TEXT NOT NULL DEFAULT 'active',
    trigger_after_minutes INTEGER NOT NULL DEFAULT 240,
    route_to_role TEXT,
    route_to_user_id TEXT,
    route_to_user_name TEXT,
    home_id INTEGER,
    applies_to_safeguarding BOOLEAN NOT NULL DEFAULT FALSE,
    applies_to_isn BOOLEAN NOT NULL DEFAULT FALSE,
    applies_to_recording BOOLEAN NOT NULL DEFAULT FALSE,
    urgent_override BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_rules_source
    ON os_notification_escalation_rules (source);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_rules_category
    ON os_notification_escalation_rules (category);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_rules_status
    ON os_notification_escalation_rules (status);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_rules_min_severity
    ON os_notification_escalation_rules (min_severity);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_rules_home_id
    ON os_notification_escalation_rules (home_id);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_rules_route_to_role
    ON os_notification_escalation_rules (route_to_role);

CREATE TABLE IF NOT EXISTS os_notification_escalation_events (
    id TEXT PRIMARY KEY,
    notification_key TEXT NOT NULL,
    escalation_rule_id TEXT,
    source TEXT,
    category TEXT,
    severity TEXT,
    route_to_role TEXT,
    route_to_user_id TEXT,
    safe_summary TEXT,
    route TEXT,
    status TEXT NOT NULL DEFAULT 'created',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_events_notification_key
    ON os_notification_escalation_events (notification_key);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_events_rule_id
    ON os_notification_escalation_events (escalation_rule_id);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_events_source
    ON os_notification_escalation_events (source);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_events_category
    ON os_notification_escalation_events (category);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_events_severity
    ON os_notification_escalation_events (severity);

CREATE INDEX IF NOT EXISTS idx_os_notification_escalation_events_created
    ON os_notification_escalation_events (created_at DESC);
