-- ORB Residential commercial infrastructure: usage caps, credits, project memory sync.

CREATE TABLE IF NOT EXISTS orb_usage_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    monthly_cap_pence INTEGER,
    warning_threshold_percent INTEGER NOT NULL DEFAULT 80,
    allow_overage BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT orb_usage_preferences_warning_check CHECK (
        warning_threshold_percent >= 0 AND warning_threshold_percent <= 100
    )
);

CREATE INDEX IF NOT EXISTS idx_orb_usage_preferences_user_id ON orb_usage_preferences(user_id);

CREATE TABLE IF NOT EXISTS orb_usage_credits (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_checkout_session_id TEXT,
    amount_pence INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT orb_usage_credits_status_check CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orb_usage_credits_session
    ON orb_usage_credits(stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orb_usage_credits_user_id ON orb_usage_credits(user_id);

CREATE TABLE IF NOT EXISTS orb_projects (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    memory TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_projects_user_id ON orb_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_projects_updated_at ON orb_projects(updated_at DESC);

CREATE TABLE IF NOT EXISTS orb_project_chats (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES orb_projects(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_orb_project_chats_project_id ON orb_project_chats(project_id);
