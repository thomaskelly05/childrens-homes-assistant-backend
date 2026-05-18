ALTER TABLE referral_extracted_risk_flags
    ADD COLUMN IF NOT EXISTS manager_review_status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS manager_review_note TEXT,
    ADD COLUMN IF NOT EXISTS manager_reviewed_by INTEGER,
    ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS manager_override_severity TEXT,
    ADD COLUMN IF NOT EXISTS manager_override_label TEXT;

CREATE INDEX IF NOT EXISTS idx_referral_risk_flags_review_status
    ON referral_extracted_risk_flags(referral_id, manager_review_status);
