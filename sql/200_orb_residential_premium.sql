-- ORB Residential premium product tables
-- Purpose: commercial spine for £9.99/month ORB Residential access.
-- This migration is intentionally standalone-safe: it stores user-owned ORB
-- product data and does not connect to live child records or OS chronology.

CREATE TABLE IF NOT EXISTS orb_trials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    converted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT orb_trials_status_check CHECK (status IN ('active', 'expired', 'converted', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_orb_trials_user_id ON orb_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_trials_status ON orb_trials(status);
CREATE INDEX IF NOT EXISTS idx_orb_trials_expires_at ON orb_trials(expires_at);

CREATE TABLE IF NOT EXISTS orb_usage_events (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL DEFAULT 'conversation',
    mode TEXT,
    workflow TEXT,
    model TEXT,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(12, 6) NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_usage_events_user_id ON orb_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_usage_events_created_at ON orb_usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_orb_usage_events_mode ON orb_usage_events(mode);
CREATE INDEX IF NOT EXISTS idx_orb_usage_events_workflow ON orb_usage_events(workflow);

CREATE TABLE IF NOT EXISTS orb_saved_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    project_type TEXT NOT NULL DEFAULT 'general',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_saved_projects_user_id ON orb_saved_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_saved_projects_project_type ON orb_saved_projects(project_type);

CREATE TABLE IF NOT EXISTS orb_saved_outputs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES orb_saved_projects(id) ON DELETE SET NULL,
    workflow TEXT NOT NULL DEFAULT 'ask_orb',
    output_type TEXT NOT NULL DEFAULT 'answer',
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_user_id ON orb_saved_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_project_id ON orb_saved_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_workflow ON orb_saved_outputs(workflow);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_created_at ON orb_saved_outputs(created_at);

CREATE TABLE IF NOT EXISTS orb_user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    role_label TEXT,
    work_environment TEXT,
    preferred_support_style TEXT,
    onboarding_completed_at TIMESTAMPTZ,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_user_preferences_role_label ON orb_user_preferences(role_label);
CREATE INDEX IF NOT EXISTS idx_orb_user_preferences_work_environment ON orb_user_preferences(work_environment);
