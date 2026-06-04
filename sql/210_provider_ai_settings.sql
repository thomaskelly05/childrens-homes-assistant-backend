-- Provider and home AI trust settings (external AI, redaction, storage, voice, retention).
-- Provider-level rows apply to all homes; home_id IS NULL.
-- Home-level rows override provider settings only when stricter (enforced in application layer).

CREATE TABLE IF NOT EXISTS provider_ai_settings (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL,
    home_id INTEGER,
    external_ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    redaction_mode TEXT NOT NULL DEFAULT 'strict',
    allowed_ai_features JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_storage BOOLEAN NOT NULL DEFAULT FALSE,
    transcript_storage BOOLEAN NOT NULL DEFAULT FALSE,
    realtime_voice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    report_ai_drafting_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    premium_tts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    data_retention_days INTEGER,
    local_policy_sources_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by INTEGER,
    review_due_at TIMESTAMPTZ,
    CONSTRAINT provider_ai_settings_redaction_mode_check
        CHECK (redaction_mode IN ('strict', 'balanced', 'off')),
    CONSTRAINT provider_ai_settings_data_retention_positive
        CHECK (data_retention_days IS NULL OR data_retention_days > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_ai_settings_provider_home
    ON provider_ai_settings (provider_id, COALESCE(home_id, 0));

CREATE INDEX IF NOT EXISTS idx_provider_ai_settings_provider_id
    ON provider_ai_settings (provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_ai_settings_home_id
    ON provider_ai_settings (home_id)
    WHERE home_id IS NOT NULL;

-- Settings change audit trail (no raw prompts or transcripts).

CREATE TABLE IF NOT EXISTS provider_ai_settings_audit (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL,
    home_id INTEGER,
    changed_by INTEGER,
    setting_key TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    acknowledgement_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_provider_ai_settings_audit_provider
    ON provider_ai_settings_audit (provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_ai_settings_audit_home
    ON provider_ai_settings_audit (home_id, created_at DESC)
    WHERE home_id IS NOT NULL;
