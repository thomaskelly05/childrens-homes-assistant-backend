-- Reg 45 Quality of Care Review drafts — metadata only, no raw bodies in JSON summaries

CREATE TABLE IF NOT EXISTS reg45_quality_reviews (
    id text PRIMARY KEY,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    period_start date,
    period_end date,
    home_id integer,
    generated_by_user_id text,
    generated_by_name text,
    summary text,
    evidence_count integer DEFAULT 0,
    gap_count integer DEFAULT 0,
    draft_only_count integer DEFAULT 0,
    improvement_action_count integer DEFAULT 0,
    review_required_count integer DEFAULT 0,
    safeguarding_review_count integer DEFAULT 0,
    review_json jsonb NOT NULL DEFAULT '{}',
    source_pack_id text,
    saved_output_id text,
    finalised_at timestamptz,
    finalised_by_user_id text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg45_reviews_status ON reg45_quality_reviews (status);
CREATE INDEX IF NOT EXISTS idx_reg45_reviews_home_id ON reg45_quality_reviews (home_id);
CREATE INDEX IF NOT EXISTS idx_reg45_reviews_generated_by ON reg45_quality_reviews (generated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reg45_reviews_period_start ON reg45_quality_reviews (period_start);
CREATE INDEX IF NOT EXISTS idx_reg45_reviews_period_end ON reg45_quality_reviews (period_end);
CREATE INDEX IF NOT EXISTS idx_reg45_reviews_created_at ON reg45_quality_reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg45_reviews_updated_at ON reg45_quality_reviews (updated_at DESC);

CREATE TABLE IF NOT EXISTS reg45_quality_review_events (
    id text PRIMARY KEY,
    review_id text NOT NULL REFERENCES reg45_quality_reviews(id) ON DELETE CASCADE,
    action text NOT NULL,
    previous_status text,
    new_status text,
    note text,
    actor_user_id text,
    actor_name text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg45_review_events_review_id ON reg45_quality_review_events (review_id);
CREATE INDEX IF NOT EXISTS idx_reg45_review_events_action ON reg45_quality_review_events (action);
CREATE INDEX IF NOT EXISTS idx_reg45_review_events_actor ON reg45_quality_review_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_reg45_review_events_created_at ON reg45_quality_review_events (created_at DESC);
