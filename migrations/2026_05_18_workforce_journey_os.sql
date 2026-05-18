-- Sprint A: Adult / Workforce Journey OS v1
-- Idempotent workforce tables used by the consolidated /api/workforce-os facade.

CREATE TABLE IF NOT EXISTS staff_training_requirements (
    id BIGSERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    training_name TEXT NOT NULL,
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    expires_after_months INTEGER NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (role, training_name)
);

CREATE TABLE IF NOT EXISTS staff_training_matrix (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL,
    home_id BIGINT NULL,
    role TEXT NULL,
    training_name TEXT NOT NULL,
    completion_date DATE NULL,
    expiry_date DATE NULL,
    status TEXT NOT NULL DEFAULT 'recorded',
    evidence_document_id BIGINT NULL,
    evidence_url TEXT NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_training_matrix_staff
    ON staff_training_matrix (staff_id, training_name);

CREATE TABLE IF NOT EXISTS workforce_supervision_records (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL,
    supervisor_id BIGINT NULL,
    home_id BIGINT NULL,
    title TEXT NOT NULL DEFAULT 'Staff supervision',
    status TEXT NOT NULL DEFAULT 'draft',
    reflective_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
    reflection TEXT NULL,
    notes TEXT NULL,
    linked_incident_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    linked_training_need_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    linked_wellbeing_signal_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    linked_practice_concern_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by_user_id BIGINT NULL,
    reviewed_by_user_id BIGINT NULL,
    reviewed_at TIMESTAMPTZ NULL,
    returned_at TIMESTAMPTZ NULL,
    return_note TEXT NULL,
    archived_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workforce_supervision_staff_status
    ON workforce_supervision_records (staff_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS workforce_supervision_actions (
    id BIGSERIAL PRIMARY KEY,
    supervision_id BIGINT NOT NULL,
    staff_id BIGINT NULL,
    home_id BIGINT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date DATE NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workforce_supervision_actions_supervision
    ON workforce_supervision_actions (supervision_id, status);

CREATE TABLE IF NOT EXISTS staff_induction_checklist_items (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL,
    staff_user_id BIGINT NULL,
    home_id BIGINT NULL,
    title TEXT NOT NULL,
    category TEXT NULL,
    due_date DATE NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    signed_off_by_user_id BIGINT NULL,
    signed_off_at TIMESTAMPTZ NULL,
    evidence_document_id BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_induction_checklist_staff
    ON staff_induction_checklist_items (staff_id, status, due_date);

CREATE TABLE IF NOT EXISTS staff_probation_reviews (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL,
    staff_user_id BIGINT NULL,
    home_id BIGINT NULL,
    milestone TEXT NOT NULL,
    review_date DATE NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    concerns_raised BOOLEAN NOT NULL DEFAULT FALSE,
    support_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    manager_sign_off_user_id BIGINT NULL,
    manager_signed_off_at TIMESTAMPTZ NULL,
    review_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_probation_reviews_staff
    ON staff_probation_reviews (staff_id, milestone, status);

CREATE TABLE IF NOT EXISTS workforce_evidence (
    id BIGSERIAL PRIMARY KEY,
    source_table TEXT NOT NULL,
    source_id BIGINT NULL,
    staff_id BIGINT NULL,
    home_id BIGINT NULL,
    title TEXT NOT NULL,
    summary TEXT NULL,
    evidence_type TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_workforce_evidence_staff
    ON workforce_evidence (staff_id, evidence_type, created_at DESC);

INSERT INTO staff_training_requirements (role, training_name, mandatory, expires_after_months)
VALUES
    ('registered_manager', 'Safeguarding', TRUE, 12),
    ('registered_manager', 'Leadership and management', TRUE, 36),
    ('registered_manager', 'Safer recruitment', TRUE, 36),
    ('deputy_manager', 'Safeguarding', TRUE, 12),
    ('deputy_manager', 'Supervision skills', TRUE, 36),
    ('manager', 'Safeguarding', TRUE, 12),
    ('manager', 'Supervision skills', TRUE, 36),
    ('staff', 'Safeguarding', TRUE, 12),
    ('staff', 'Medication', TRUE, 12),
    ('staff', 'Recording quality', TRUE, 12),
    ('agency', 'Safeguarding', TRUE, 12),
    ('agency', 'Home induction', TRUE, 12)
ON CONFLICT (role, training_name) DO NOTHING;
