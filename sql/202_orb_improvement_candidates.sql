-- ORB improvement candidates and feedback review trail.
-- Review-led learning loop: candidates require admin approval before any prompt/scenario changes.

ALTER TABLE orb_feedback ADD COLUMN IF NOT EXISTS reviewed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orb_feedback ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orb_feedback ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE orb_feedback ADD COLUMN IF NOT EXISTS reviewer_note TEXT;

CREATE INDEX IF NOT EXISTS idx_orb_feedback_reviewed ON orb_feedback(reviewed);

CREATE TABLE IF NOT EXISTS orb_improvement_candidates (
    id BIGSERIAL PRIMARY KEY,
    candidate_id TEXT NOT NULL UNIQUE,
    candidate_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    source_feedback_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    proposed_change JSONB NOT NULL DEFAULT '{}'::jsonb,
    affected_family TEXT,
    affected_action TEXT,
    affected_source TEXT,
    affected_role TEXT,
    reason_count INTEGER NOT NULL DEFAULT 1,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.5,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reviewer_note TEXT,
    CONSTRAINT orb_improvement_candidates_status_check CHECK (
        status IN ('pending', 'approved', 'rejected')
    )
);

CREATE INDEX IF NOT EXISTS idx_orb_improvement_candidates_status ON orb_improvement_candidates(status);
CREATE INDEX IF NOT EXISTS idx_orb_improvement_candidates_type ON orb_improvement_candidates(candidate_type);
CREATE INDEX IF NOT EXISTS idx_orb_improvement_candidates_family ON orb_improvement_candidates(affected_family);
CREATE INDEX IF NOT EXISTS idx_orb_improvement_candidates_created_at ON orb_improvement_candidates(created_at);
