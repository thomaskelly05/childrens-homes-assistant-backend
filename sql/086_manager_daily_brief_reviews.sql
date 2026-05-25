-- Manager daily brief reviewed state per user/day/home
CREATE TABLE IF NOT EXISTS manager_daily_brief_reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT,
    home_id INTEGER,
    brief_date DATE NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    review_note TEXT,
    summary_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_daily_brief_reviews_user
    ON manager_daily_brief_reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_manager_daily_brief_reviews_home
    ON manager_daily_brief_reviews (home_id);

CREATE INDEX IF NOT EXISTS idx_manager_daily_brief_reviews_date
    ON manager_daily_brief_reviews (brief_date);

CREATE INDEX IF NOT EXISTS idx_manager_daily_brief_reviews_reviewed
    ON manager_daily_brief_reviews (reviewed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_daily_brief_reviews_user_date_home
    ON manager_daily_brief_reviews (user_id, brief_date, COALESCE(home_id, 0));
