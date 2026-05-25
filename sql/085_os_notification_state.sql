-- OS notification lifecycle state (metadata only — no raw bodies)
CREATE TABLE IF NOT EXISTS os_notification_state (
    id TEXT PRIMARY KEY,
    notification_key TEXT NOT NULL,
    source TEXT NOT NULL,
    category TEXT,
    related_id TEXT,
    related_type TEXT,
    status TEXT NOT NULL DEFAULT 'unread',
    unread BOOLEAN NOT NULL DEFAULT TRUE,
    owner_user_id TEXT,
    owner_name TEXT,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    read_by TEXT,
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_os_notification_state_key
    ON os_notification_state (notification_key);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_source
    ON os_notification_state (source);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_category
    ON os_notification_state (category);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_related_id
    ON os_notification_state (related_id);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_related_type
    ON os_notification_state (related_type);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_status
    ON os_notification_state (status);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_unread
    ON os_notification_state (unread);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_owner
    ON os_notification_state (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_created
    ON os_notification_state (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_notification_state_updated
    ON os_notification_state (updated_at DESC);
