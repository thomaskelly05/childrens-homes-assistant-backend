-- IndiCare full field preservation from indic.sql
-- Additive only: no drops, no narrowing, no fake data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public."young_people" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "home_id" INTEGER;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "first_name" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "last_name" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "preferred_name" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "ethnicity" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "nhs_number" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "local_id_number" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "admission_date" DATE;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "discharge_date" DATE;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "placement_status" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "summary_risk_level" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "legal_status" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "care_planning" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "social_worker_name" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "social_worker_email" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "social_worker_phone" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "profile_photo_path" TEXT;
ALTER TABLE public."young_people" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE TABLE IF NOT EXISTS public."daily_notes" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "home_id" INTEGER;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "note_date" DATE;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "shift_type" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "mood" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "presentation" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "activities" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "education_update" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "health_update" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "family_update" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "behaviour_update" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "young_person_voice" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "positives" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "actions_required" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "manager_review_status" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "routine_stability" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "relationships_update" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "emotional_wellbeing" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "safeguarding_concerns" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "staff_reflection" TEXT;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE public."daily_notes" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;

CREATE TABLE IF NOT EXISTS public."incidents" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "home_id" INTEGER;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "staff_id" INTEGER;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "incident_type" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "incident_datetime" TIMESTAMP;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "antecedent" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "staff_response" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "child_response" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "injury_flag" BOOLEAN;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "police_involved" BOOLEAN;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "safeguarding_flag" BOOLEAN;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "presentation" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "trauma_informed_formulation" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "restorative_follow_up" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "actions_taken" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "requires_reg40" BOOLEAN;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "requires_notification" BOOLEAN;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."incidents" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;

CREATE TABLE IF NOT EXISTS public."missing_episodes" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "start_datetime" TIMESTAMP;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "reported_datetime" TIMESTAMP;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "police_reference" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "return_datetime" TIMESTAMP;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "trigger_factors" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "push_pull_factors" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "actions_taken" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "contextual_risk_notes" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "manager_review_status" TEXT;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE public."missing_episodes" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;

CREATE TABLE IF NOT EXISTS public."risk_assessments" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "concern_summary" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "known_triggers" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "early_warning_signs" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "contextual_factors" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "protective_factors" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "staff_response_plan" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "review_date" DATE;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE public."risk_assessments" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

CREATE TABLE IF NOT EXISTS public."support_plans" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "plan_type" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "presenting_need" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "proactive_strategies" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "co_regulation_strategies" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "relationships_support" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "review_date" DATE;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE public."support_plans" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

CREATE TABLE IF NOT EXISTS public."health_records" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "record_type" TEXT;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "event_datetime" TIMESTAMP;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "professional_name" TEXT;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."health_records" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;

CREATE TABLE IF NOT EXISTS public."education_records" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "record_date" DATE;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "attendance_status" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "provision_name" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "behaviour_summary" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "learning_engagement" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "issue_raised" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "support_action" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."education_records" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;

CREATE TABLE IF NOT EXISTS public."family_contact_records" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "contact_datetime" TIMESTAMP;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "contact_type" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "contact_person" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "supervision_level" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "pre_contact_presentation" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "post_contact_presentation" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."family_contact_records" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;

CREATE TABLE IF NOT EXISTS public."keywork_sessions" (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "session_date" DATE;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "worker_id" INTEGER;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "child_voice" TEXT;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "reflective_analysis" TEXT;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "workflow_status" TEXT;
ALTER TABLE public."keywork_sessions" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;

CREATE TABLE IF NOT EXISTS public."os_chronology_events" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "provider_id" INTEGER;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "home_id" INTEGER;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "young_person_id" INTEGER;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "staff_id" INTEGER;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "event_type" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "event_title" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "event_summary" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "event_at" TIMESTAMPTZ;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "source_table" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "source_id" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "source_type" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "record_type" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "lifecycle_state" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "emotional_theme" TEXT;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "child_voice_present" BOOLEAN;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "safeguarding_marker" BOOLEAN;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "evidence_ids" JSONB;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "created_by" INTEGER;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE public."os_chronology_events" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_type TEXT,
    evidence_type TEXT DEFAULT 'record',
    title TEXT,
    summary TEXT,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    chronology_event_id UUID,
    workflow_event_id BIGINT,
    lifecycle_state TEXT DEFAULT 'linked',
    sccif_area TEXT,
    quality_standard TEXT,
    regulation TEXT,
    inspection_relevance TEXT,
    review_status TEXT DEFAULT 'unreviewed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_table, source_id, evidence_type)
);
CREATE TABLE IF NOT EXISTS public.os_evidence_links (LIKE public.evidence_links INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS public.operational_projection_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_key TEXT NOT NULL UNIQUE,
    projection_type TEXT NOT NULL,
    domain TEXT NOT NULL,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    payload JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1,
    stale BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP VIEW IF EXISTS public.vw_os_chronology_pullthrough CASCADE;
DROP VIEW IF EXISTS public.vw_os_young_person_profile CASCADE;

CREATE VIEW public.vw_os_young_person_profile AS
SELECT yp.*,
       yp.id AS young_person_id,
       COALESCE(NULLIF(yp.preferred_name, ''), yp.first_name) AS os_preferred_name,
       COALESCE(NULLIF(trim(concat_ws(' ', yp.first_name, yp.last_name)), ''), 'Young person ' || yp.id::text) AS os_display_name
FROM public.young_people yp;

CREATE VIEW public.vw_os_chronology_pullthrough AS
SELECT id,
       source_table,
       source_id::text AS source_id,
       COALESCE(source_type, event_type, record_type, 'record') AS source_type,
       COALESCE(record_type, source_type, event_type, 'record') AS record_type,
       young_person_id,
       staff_id,
       home_id,
       provider_id,
       COALESCE(title, event_title, 'Record') AS title,
       COALESCE(summary, event_summary, body, '') AS summary,
       body,
       event_at,
       lifecycle_state,
       emotional_theme,
       child_voice_present,
       safeguarding_marker,
       evidence_ids,
       metadata,
       created_by,
       created_at,
       updated_at
FROM public.os_chronology_events;
