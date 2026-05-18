-- Sprint A.5: Workforce Intelligence Layer
-- Central evidence-aware tables for chronology, recording quality, risk and relationships.

CREATE TABLE IF NOT EXISTS workforce_chronology_events (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NULL,
    home_id BIGINT NULL,
    provider_id BIGINT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    source_table TEXT NULL,
    source_id BIGINT NULL,
    linked_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workforce_chronology_staff
    ON workforce_chronology_events (staff_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_chronology_home
    ON workforce_chronology_events (home_id, event_type, event_at DESC);

CREATE TABLE IF NOT EXISTS workforce_recording_quality_scores (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NULL,
    home_id BIGINT NULL,
    source_table TEXT NOT NULL,
    source_id BIGINT NULL,
    score INTEGER NOT NULL,
    rating TEXT NOT NULL,
    child_voice_present BOOLEAN NOT NULL DEFAULT FALSE,
    safeguarding_language_present BOOLEAN NOT NULL DEFAULT FALSE,
    restorative_language_present BOOLEAN NOT NULL DEFAULT FALSE,
    vague_wording_hits JSONB NOT NULL DEFAULT '[]'::jsonb,
    reflection_quality TEXT NOT NULL DEFAULT 'not_scored',
    timeliness_hours NUMERIC NULL,
    scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_workforce_recording_quality_staff
    ON workforce_recording_quality_scores (staff_id, scored_at DESC);

CREATE TABLE IF NOT EXISTS workforce_relationship_indicators (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL,
    young_person_id BIGINT NOT NULL,
    home_id BIGINT NULL,
    interactions INTEGER NOT NULL DEFAULT 0,
    positive_engagement INTEGER NOT NULL DEFAULT 0,
    conflict_indicators INTEGER NOT NULL DEFAULT 0,
    keyworker_stability_score INTEGER NULL,
    relational_safety_score INTEGER NULL,
    latest_contact_at TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (staff_id, young_person_id)
);

CREATE INDEX IF NOT EXISTS idx_workforce_relationship_home
    ON workforce_relationship_indicators (home_id, relational_safety_score);

CREATE TABLE IF NOT EXISTS workforce_intelligence_snapshots (
    id BIGSERIAL PRIMARY KEY,
    home_id BIGINT NULL,
    provider_id BIGINT NULL,
    scope TEXT NOT NULL DEFAULT 'home',
    health_score INTEGER NULL,
    risk_level TEXT NULL,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id BIGINT NULL
);

CREATE INDEX IF NOT EXISTS idx_workforce_intelligence_snapshots_home
    ON workforce_intelligence_snapshots (home_id, generated_at DESC);
