-- ORB standalone answer feedback and extended usage telemetry.
-- Standalone-safe: no OS child/home/staff/record identifiers.

CREATE TABLE IF NOT EXISTS orb_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message_id TEXT NOT NULL,
    conversation_id TEXT,
    rating TEXT NOT NULL,
    reason TEXT,
    comment TEXT,
    answer_snapshot TEXT,
    question_snapshot TEXT,
    mode TEXT,
    profile_role TEXT,
    prompt_tier TEXT,
    detected_family TEXT,
    secondary_families JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_anchors JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_id TEXT,
    document_lens TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT orb_feedback_rating_check CHECK (rating IN ('up', 'down')),
    CONSTRAINT orb_feedback_reason_check CHECK (
        reason IS NULL OR reason IN (
            'helpful',
            'too_generic',
            'missed_safeguarding',
            'missed_child_voice',
            'missed_ofsted_reg44',
            'missed_manager_oversight',
            'missed_risk',
            'missed_recording',
            'missed_nvq_learning',
            'wrong_tone',
            'too_long',
            'too_short',
            'unsafe',
            'incorrect_source',
            'not_practical',
            'wrong_role',
            'other'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_orb_feedback_user_id ON orb_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_feedback_created_at ON orb_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_orb_feedback_rating ON orb_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_orb_feedback_reason ON orb_feedback(reason);
CREATE INDEX IF NOT EXISTS idx_orb_feedback_detected_family ON orb_feedback(detected_family);
CREATE INDEX IF NOT EXISTS idx_orb_feedback_action_id ON orb_feedback(action_id);

-- Extend usage events for cost-control analytics (nullable for backward compatibility).
ALTER TABLE orb_usage_events ADD COLUMN IF NOT EXISTS route TEXT;
ALTER TABLE orb_usage_events ADD COLUMN IF NOT EXISTS action_id TEXT;
ALTER TABLE orb_usage_events ADD COLUMN IF NOT EXISTS document_lens TEXT;
ALTER TABLE orb_usage_events ADD COLUMN IF NOT EXISTS prompt_tier TEXT;
ALTER TABLE orb_usage_events ADD COLUMN IF NOT EXISTS provider TEXT;

CREATE INDEX IF NOT EXISTS idx_orb_usage_events_prompt_tier ON orb_usage_events(prompt_tier);
CREATE INDEX IF NOT EXISTS idx_orb_usage_events_event_type ON orb_usage_events(event_type);
