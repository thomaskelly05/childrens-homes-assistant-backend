-- Durable AI usage audit (metadata only — no prompt/transcript/document text).

CREATE TABLE IF NOT EXISTS ai_usage_audit (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    home_id INTEGER,
    user_id INTEGER,
    feature TEXT NOT NULL,
    model TEXT,
    redaction_mode TEXT,
    redaction_applied BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_output_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_gbp NUMERIC(12, 6) NOT NULL DEFAULT 0,
    prompt_stored BOOLEAN NOT NULL DEFAULT FALSE,
    transcript_stored BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_audit_provider_created
    ON ai_usage_audit (provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_audit_home_created
    ON ai_usage_audit (home_id, created_at DESC)
    WHERE home_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_audit_feature
    ON ai_usage_audit (feature);
