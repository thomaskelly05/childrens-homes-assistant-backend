-- IndiCare OS young person care recording system
-- Core residential childcare recording layer for daily care, key work, observations, health, education, family contact and plans.

DO $$ BEGIN
  CREATE TYPE os_care_record_type AS ENUM (
    'daily_record',
    'observation',
    'key_work_session',
    'incident_note',
    'health_note',
    'education_note',
    'family_contact',
    'professional_contact',
    'behaviour_note',
    'emotional_wellbeing_note',
    'independence_skill',
    'life_story_work',
    'placement_plan_update',
    'risk_assessment_update',
    'care_plan_update',
    'positive_outcome',
    'concern'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_care_record_status AS ENUM ('draft','submitted','manager_review','approved','returned','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_record_sensitivity AS ENUM ('standard','sensitive','restricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_young_person_care_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  record_type os_care_record_type NOT NULL,
  status os_care_record_status NOT NULL DEFAULT 'submitted',
  record_date date NOT NULL DEFAULT current_date,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  narrative text NOT NULL,
  child_voice text,
  staff_analysis text,
  impact_on_child text,
  actions_taken jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_summary text,
  mood text,
  presentation text,
  location text,
  sccif_area text CHECK (sccif_area IS NULL OR sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  regulation_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT true,
  sensitivity os_record_sensitivity NOT NULL DEFAULT 'standard',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  manager_review_required boolean NOT NULL DEFAULT false,
  reviewed_by int4,
  reviewed_at timestamptz,
  manager_comment text,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by int4,
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_young_person_daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  summary_date date NOT NULL,
  morning_summary text,
  afternoon_summary text,
  evening_summary text,
  night_summary text,
  overall_presentation text,
  wellbeing_summary text,
  safeguarding_summary text,
  education_summary text,
  health_summary text,
  family_contact_summary text,
  positives jsonb NOT NULL DEFAULT '[]'::jsonb,
  concerns jsonb NOT NULL DEFAULT '[]'::jsonb,
  handover_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  manager_review_required boolean NOT NULL DEFAULT false,
  completed_by int4,
  completed_at timestamptz,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (home_id, young_person_id, summary_date)
);

CREATE TABLE IF NOT EXISTS public.os_young_person_care_plan_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  section_key text NOT NULL,
  section_title text NOT NULL,
  current_summary text NOT NULL,
  needs text,
  risks text,
  strengths text,
  support_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_frequency_days int4 NOT NULL DEFAULT 30,
  last_reviewed_at timestamptz,
  next_review_due date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','review_due','archived')),
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by int4,
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, young_person_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_os_care_records_yp_date ON public.os_young_person_care_records(young_person_id, record_date DESC, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_care_records_home_type ON public.os_young_person_care_records(home_id, record_type, status, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_os_care_records_review ON public.os_young_person_care_records(home_id, manager_review_required, status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_daily_summary_home_date ON public.os_young_person_daily_summary(home_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_os_care_plan_sections_yp ON public.os_young_person_care_plan_sections(young_person_id, section_key, status);

CREATE OR REPLACE FUNCTION public.os_create_care_record(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_record_type os_care_record_type,
  p_title text,
  p_narrative text,
  p_child_voice text DEFAULT NULL,
  p_staff_analysis text DEFAULT NULL,
  p_impact_on_child text DEFAULT NULL,
  p_actions_taken jsonb DEFAULT '[]'::jsonb,
  p_follow_up_required boolean DEFAULT false,
  p_follow_up_summary text DEFAULT NULL,
  p_mood text DEFAULT NULL,
  p_presentation text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_sccif_area text DEFAULT NULL,
  p_safeguarding_relevant boolean DEFAULT false,
  p_sensitivity os_record_sensitivity DEFAULT 'standard',
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_chronology_id uuid;
  v_manager_review boolean;
BEGIN
  v_manager_review := p_follow_up_required OR p_safeguarding_relevant OR p_record_type IN ('incident_note','concern','risk_assessment_update');

  INSERT INTO public.os_young_person_care_records (
    provider_id, home_id, young_person_id, record_type, title, narrative, child_voice,
    staff_analysis, impact_on_child, actions_taken, follow_up_required, follow_up_summary,
    mood, presentation, location, sccif_area, safeguarding_relevant, sensitivity, tags,
    manager_review_required, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_record_type, p_title, p_narrative, p_child_voice,
    p_staff_analysis, p_impact_on_child, coalesce(p_actions_taken, '[]'::jsonb), p_follow_up_required, p_follow_up_summary,
    p_mood, p_presentation, p_location, p_sccif_area, p_safeguarding_relevant, p_sensitivity, coalesce(p_tags, ARRAY[]::text[]),
    v_manager_review, p_created_by
  ) RETURNING id INTO v_id;

  v_chronology_id := public.os_chronology_add_event(
    'care_record_' || p_record_type::text,
    p_title,
    p_narrative,
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    now(),
    'os_young_person_care_records',
    NULL,
    NULL,
    coalesce(p_sccif_area, CASE WHEN p_safeguarding_relevant THEN 'helped_and_protected' ELSE 'children_experiences_progress' END),
    ARRAY['Care recording'],
    jsonb_build_array(jsonb_build_object('table','os_young_person_care_records','id',v_id)),
    CASE WHEN p_sensitivity = 'restricted' THEN 'manager' ELSE 'staff' END,
    p_sensitivity <> 'standard',
    p_created_by,
    jsonb_build_object('care_record_id', v_id, 'record_type', p_record_type, 'manager_review_required', v_manager_review)
  );

  IF v_manager_review THEN
    PERFORM public.os_command_create_manual_item(
      'incident_manager_review',
      p_provider_id,
      p_home_id,
      p_young_person_id,
      NULL,
      'Care record requires management review: ' || p_title,
      'os_young_person_care_records',
      NULL,
      now() + interval '48 hours',
      p_created_by,
      jsonb_build_object('care_record_id', v_id, 'chronology_event_id', v_chronology_id)
    );
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_approve_care_record(
  p_record_id uuid,
  p_manager_comment text DEFAULT NULL,
  p_reviewed_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_record public.os_young_person_care_records%ROWTYPE;
BEGIN
  SELECT * INTO v_record FROM public.os_young_person_care_records WHERE id = p_record_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care record not found: %', p_record_id;
  END IF;

  UPDATE public.os_young_person_care_records
  SET status = 'approved',
      manager_review_required = false,
      reviewed_by = p_reviewed_by,
      reviewed_at = now(),
      manager_comment = p_manager_comment,
      updated_by = p_reviewed_by,
      updated_at = now()
  WHERE id = p_record_id;

  PERFORM public.os_chronology_add_event(
    'care_record_manager_review',
    'Manager reviewed care record: ' || v_record.title,
    coalesce(p_manager_comment, 'Care record reviewed by manager.'),
    v_record.provider_id,
    v_record.home_id,
    v_record.young_person_id,
    NULL,
    now(),
    'os_young_person_care_records',
    NULL,
    NULL,
    'leadership_management',
    ARRAY['Manager oversight','Care record review'],
    jsonb_build_array(jsonb_build_object('table','os_young_person_care_records','id',p_record_id)),
    'manager',
    false,
    p_reviewed_by,
    jsonb_build_object('care_record_id', p_record_id)
  );

  RETURN p_record_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_young_person_care_record_feed AS
SELECT
  r.id,
  r.provider_id,
  r.home_id,
  r.young_person_id,
  r.record_type::text AS record_type,
  r.status::text AS status,
  r.record_date,
  r.occurred_at,
  r.title,
  r.narrative,
  r.child_voice,
  r.staff_analysis,
  r.impact_on_child,
  r.actions_taken,
  r.follow_up_required,
  r.follow_up_summary,
  r.mood,
  r.presentation,
  r.location,
  r.sccif_area,
  r.safeguarding_relevant,
  r.inspection_relevant,
  r.sensitivity::text AS sensitivity,
  r.tags,
  r.manager_review_required,
  r.reviewed_by,
  r.reviewed_at,
  r.manager_comment,
  r.created_by,
  r.created_at,
  CASE
    WHEN r.manager_review_required THEN 'requires_manager_review'
    WHEN r.safeguarding_relevant THEN 'safeguarding_relevant'
    WHEN r.status = 'draft' THEN 'draft'
    ELSE 'recorded'
  END AS feed_state
FROM public.os_young_person_care_records r
ORDER BY r.occurred_at DESC;

CREATE OR REPLACE VIEW public.vw_os_young_person_recording_summary AS
SELECT
  provider_id,
  home_id,
  young_person_id,
  count(*) FILTER (WHERE record_date = current_date) AS records_today,
  count(*) FILTER (WHERE manager_review_required = true) AS manager_review_count,
  count(*) FILTER (WHERE safeguarding_relevant = true AND record_date >= current_date - interval '7 days') AS safeguarding_records_7_days,
  count(*) FILTER (WHERE record_type = 'positive_outcome' AND record_date >= current_date - interval '7 days') AS positives_7_days,
  count(*) FILTER (WHERE record_type = 'concern' AND record_date >= current_date - interval '7 days') AS concerns_7_days,
  max(occurred_at) AS latest_record_at
FROM public.os_young_person_care_records
GROUP BY provider_id, home_id, young_person_id;

CREATE OR REPLACE VIEW public.vw_os_care_plan_review_board AS
SELECT
  id,
  provider_id,
  home_id,
  young_person_id,
  section_key,
  section_title,
  current_summary,
  needs,
  risks,
  strengths,
  support_actions,
  review_frequency_days,
  last_reviewed_at,
  next_review_due,
  status,
  created_at,
  updated_at,
  CASE
    WHEN next_review_due IS NOT NULL AND next_review_due < current_date THEN 'overdue'
    WHEN next_review_due IS NOT NULL AND next_review_due <= current_date + interval '7 days' THEN 'due_soon'
    ELSE 'current'
  END AS review_state
FROM public.os_young_person_care_plan_sections
WHERE status IN ('active','review_due')
ORDER BY
  CASE
    WHEN next_review_due IS NOT NULL AND next_review_due < current_date THEN 0
    WHEN next_review_due IS NOT NULL AND next_review_due <= current_date + interval '7 days' THEN 1
    ELSE 2
  END,
  next_review_due ASC NULLS LAST;
