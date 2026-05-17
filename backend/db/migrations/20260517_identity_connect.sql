CREATE TABLE IF NOT EXISTS connect_threads (
    id BIGSERIAL PRIMARY KEY,
    provider_id INTEGER NULL,
    home_id INTEGER NULL,
    thread_type TEXT NOT NULL CHECK (thread_type IN ('home_channel', 'direct', 'group', 'handover')),
    title TEXT NOT NULL,
    created_by INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS connect_thread_members (
    thread_id BIGINT NOT NULL REFERENCES connect_threads(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    muted_at TIMESTAMPTZ NULL,
    PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS connect_messages (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES connect_threads(id) ON DELETE CASCADE,
    provider_id INTEGER NULL,
    home_id INTEGER NULL,
    author_id INTEGER NULL,
    body TEXT NOT NULL,
    linked_child_id INTEGER NULL,
    linked_record_type TEXT NULL,
    linked_record_id TEXT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS connect_message_reads (
    message_id BIGINT NOT NULL REFERENCES connect_messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS connect_notifications (
    id BIGSERIAL PRIMARY KEY,
    provider_id INTEGER NULL,
    home_id INTEGER NULL,
    user_id INTEGER NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NULL,
    linked_thread_id BIGINT NULL REFERENCES connect_threads(id) ON DELETE SET NULL,
    linked_message_id BIGINT NULL REFERENCES connect_messages(id) ON DELETE SET NULL,
    linked_child_id INTEGER NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handover_entries (
    id BIGSERIAL PRIMARY KEY,
    provider_id INTEGER NULL,
    home_id INTEGER NOT NULL,
    author_id INTEGER NULL,
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_type TEXT NOT NULL DEFAULT 'day',
    visibility TEXT NOT NULL DEFAULT 'home',
    linked_child_id INTEGER NULL,
    linked_record_type TEXT NULL,
    linked_record_id TEXT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    body TEXT NOT NULL,
    acknowledged_by JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
    user_id INTEGER PRIMARY KEY,
    layout JSONB NOT NULL DEFAULT '[]'::jsonb,
    pinned_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_threads_scope ON connect_threads (provider_id, home_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connect_thread_members_user ON connect_thread_members (user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_connect_messages_thread ON connect_messages (thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_connect_message_reads_user ON connect_message_reads (user_id, message_id);
CREATE INDEX IF NOT EXISTS idx_connect_notifications_user ON connect_notifications (user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handover_entries_today ON handover_entries (provider_id, home_id, shift_date, priority, created_at DESC);
