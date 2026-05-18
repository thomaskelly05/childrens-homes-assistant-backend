CREATE TABLE IF NOT EXISTS referral_home_matching_capabilities (
    id SERIAL PRIMARY KEY,
    home_id INTEGER NOT NULL,
    manager_user_id INTEGER,
    accepts_age_min INTEGER,
    accepts_age_max INTEGER,
    accepts_gender TEXT,
    accepts_autism BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_learning_disability BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_global_developmental_delay BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_trauma_history BOOLEAN NOT NULL DEFAULT TRUE,
    accepts_cse_risk BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_knife_risk BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_fire_setting BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_self_harm BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_suicidal_ideation BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_physical_aggression BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_sexualised_behaviour BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_missing_from_care BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_substance_misuse BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_criminal_exploitation BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_gang_affiliation BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_high_supervision BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_deprivation_of_liberty BOOLEAN NOT NULL DEFAULT FALSE,
    current_capacity INTEGER NOT NULL DEFAULT 0,
    emergency_bed_available BOOLEAN NOT NULL DEFAULT FALSE,
    matching_notes TEXT,
    exclusion_notes TEXT,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(home_id)
);

CREATE TABLE IF NOT EXISTS referral_cases (
    id SERIAL PRIMARY KEY,
    referral_reference TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'received',
    source_local_authority TEXT,
    referrer_name TEXT,
    referrer_email TEXT,
    referrer_phone TEXT,
    young_person_first_name TEXT,
    young_person_last_name TEXT,
    preferred_name TEXT,
    date_of_birth DATE,
    age INTEGER,
    gender TEXT,
    legal_status TEXT,
    care_status TEXT,
    current_placement_type TEXT,
    requested_start_date DATE,
    urgency TEXT DEFAULT 'standard',
    reason_for_referral TEXT,
    presenting_needs TEXT,
    known_diagnoses TEXT,
    communication_needs TEXT,
    education_summary TEXT,
    health_summary TEXT,
    medication_summary TEXT,
    family_contact_summary TEXT,
    risk_summary TEXT,
    strengths_summary TEXT,
    child_voice TEXT,
    ai_extraction_status TEXT NOT NULL DEFAULT 'pending',
    ai_confidence NUMERIC(5,2),
    extracted_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    regulatory_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended_home_id INTEGER,
    recommended_decision TEXT,
    manager_decision TEXT,
    decision_reason TEXT,
    converted_young_person_id INTEGER,
    converted_at TIMESTAMPTZ,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_documents (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER NOT NULL REFERENCES referral_cases(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL DEFAULT 'referral_document',
    title TEXT,
    file_name TEXT,
    file_url TEXT,
    file_type TEXT,
    extracted_text TEXT,
    extracted_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    extraction_status TEXT NOT NULL DEFAULT 'pending',
    uploaded_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_extracted_risk_flags (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER NOT NULL REFERENCES referral_cases(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    flag_label TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    evidence TEXT,
    confidence NUMERIC(5,2),
    source_document_id INTEGER REFERENCES referral_documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_matching_assessments (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER NOT NULL REFERENCES referral_cases(id) ON DELETE CASCADE,
    home_id INTEGER NOT NULL,
    manager_user_id INTEGER,
    fit_score NUMERIC(6,2) NOT NULL DEFAULT 0,
    risk_score NUMERIC(6,2) NOT NULL DEFAULT 0,
    compatibility_status TEXT NOT NULL DEFAULT 'needs_review',
    matched_capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    unmet_needs JSONB NOT NULL DEFAULT '[]'::jsonb,
    peer_impact_summary TEXT,
    manager_notes TEXT,
    recommendation TEXT,
    regulatory_rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(referral_id, home_id)
);

CREATE TABLE IF NOT EXISTS referral_peer_risk_weightings (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER NOT NULL REFERENCES referral_cases(id) ON DELETE CASCADE,
    home_id INTEGER NOT NULL,
    existing_young_person_id INTEGER,
    risk_domain TEXT NOT NULL,
    compatibility_level TEXT NOT NULL DEFAULT 'unknown',
    risk_weight NUMERIC(6,2) NOT NULL DEFAULT 0,
    rationale TEXT,
    protective_factors TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_cases_status ON referral_cases(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_cases_recommended_home ON referral_cases(recommended_home_id, status);
CREATE INDEX IF NOT EXISTS idx_referral_documents_referral ON referral_documents(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_risk_flags_referral ON referral_extracted_risk_flags(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_matching_referral ON referral_matching_assessments(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_peer_weighting_referral ON referral_peer_risk_weightings(referral_id);
