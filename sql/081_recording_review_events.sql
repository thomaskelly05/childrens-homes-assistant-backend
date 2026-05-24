-- Manager review events for operational recording drafts (not standalone ORB)

CREATE TABLE IF NOT EXISTS recording_review_events (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    previous_review_status TEXT,
    new_review_status TEXT,
    comments TEXT,
    reviewer_user_id TEXT,
    reviewer_name TEXT,
    reviewer_role TEXT,
    home_id INTEGER,
    child_id INTEGER,
    recording_type TEXT,
    form_id TEXT,
    manager_review_required BOOLEAN DEFAULT FALSE,
    safeguarding_review_required BOOLEAN DEFAULT FALSE,
    safeguarding_escalation_required BOOLEAN DEFAULT FALSE,
    submitted BOOLEAN DEFAULT FALSE,
    formal_record_created BOOLEAN DEFAULT FALSE,
    linked_record_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recording_review_events_draft_id ON recording_review_events (draft_id);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_reviewer_user_id ON recording_review_events (reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_home_id ON recording_review_events (home_id);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_child_id ON recording_review_events (child_id);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_recording_type ON recording_review_events (recording_type);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_decision ON recording_review_events (decision);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_new_review_status ON recording_review_events (new_review_status);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_safeguarding_escalation ON recording_review_events (safeguarding_escalation_required);
CREATE INDEX IF NOT EXISTS idx_recording_review_events_created_at ON recording_review_events (created_at DESC);

ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS review_comments TEXT;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS reviewed_by_user_id TEXT;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS reviewed_by_name TEXT;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS reviewed_by_role TEXT;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS review_priority TEXT DEFAULT 'medium';
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS changes_requested_at TIMESTAMPTZ;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS safeguarding_escalation_at TIMESTAMPTZ;
