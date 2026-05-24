-- Structured high-risk recording form data on operational drafts

ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS structured_template_id TEXT;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS structured_template_version TEXT;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS structured_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS structured_summary JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS structured_completion JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE recording_drafts ADD COLUMN IF NOT EXISTS structured_review_triggers JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_recording_drafts_structured_template_id
    ON recording_drafts (structured_template_id)
    WHERE structured_template_id IS NOT NULL;
