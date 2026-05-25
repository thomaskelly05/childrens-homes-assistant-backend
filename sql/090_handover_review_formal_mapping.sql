-- Handover review lifecycle, formal mapping fields, and audit events

ALTER TABLE IF EXISTS public.handover_drafts
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS review_comments TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by_name TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS formal_record_created BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS formal_record_id TEXT,
    ADD COLUMN IF NOT EXISTS formal_record_type TEXT,
    ADD COLUMN IF NOT EXISTS formal_status TEXT NOT NULL DEFAULT 'not_attempted',
    ADD COLUMN IF NOT EXISTS timeline_linked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS linked_timeline_id TEXT,
    ADD COLUMN IF NOT EXISTS safeguarding_review_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS manager_review_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS review_required_reason TEXT,
    ADD COLUMN IF NOT EXISTS completion_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS next_steps JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.handover_review_events (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    comments TEXT,
    reviewer_user_id TEXT,
    reviewer_name TEXT,
    home_id INTEGER,
    child_id INTEGER,
    safeguarding_review_required BOOLEAN NOT NULL DEFAULT FALSE,
    manager_review_required BOOLEAN NOT NULL DEFAULT FALSE,
    formal_record_created BOOLEAN NOT NULL DEFAULT FALSE,
    formal_record_id TEXT,
    timeline_linked BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handover_review_events_draft_id
    ON public.handover_review_events (draft_id);
CREATE INDEX IF NOT EXISTS idx_handover_review_events_decision
    ON public.handover_review_events (decision);
CREATE INDEX IF NOT EXISTS idx_handover_review_events_reviewer_user_id
    ON public.handover_review_events (reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_handover_review_events_home_id
    ON public.handover_review_events (home_id);
CREATE INDEX IF NOT EXISTS idx_handover_review_events_child_id
    ON public.handover_review_events (child_id);
CREATE INDEX IF NOT EXISTS idx_handover_review_events_new_status
    ON public.handover_review_events (new_status);
CREATE INDEX IF NOT EXISTS idx_handover_review_events_created_at
    ON public.handover_review_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handover_drafts_review_status
    ON public.handover_drafts (review_status);
