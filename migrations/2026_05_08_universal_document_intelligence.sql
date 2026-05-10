-- IndiCare Universal Document Intelligence
-- Classifies uploaded documents, extracts expiry/review dates, creates reminders/tasks,
-- and routes information into relevant OS areas such as education, health, placement,
-- safeguarding, staff, home and provider records.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_intelligence_status') THEN
    CREATE TYPE document_intelligence_status AS ENUM (
      'queued',
      'processing',
      'classified',
      'routed',
      'review_required',
      'completed',
      'failed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_intelligence_category') THEN
    CREATE TYPE document_intelligence_category AS ENUM (
      'pep',
      'ehcp',
      'education_plan',
      'care_plan',
      'placement_plan',
      'risk_assessment',
      'support_plan',
      'health_plan',
      'medication_document',
      'therapy_report',
      'lac_review',
      'pathway_plan',
      'court_order',
      'safeguarding_document',
      'missing_protocol',
      'consent_form',
      'identity_document',
      'statutory_document',
      'staff_training',
      'staff_supervision',
      'safer_recruitment',
      'policy',
      'home_certificate',
      'insurance',
      'reg44',
      'reg45',
      'inspection_report',
      'complaint',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_route_target') THEN
    CREATE TYPE document_route_target AS ENUM (
      'education',
      'health',
      'care_plan',
      'placement',
      'risk',
      'safeguarding',
      'chronology',
      'family',
      'legal',
      'staff_record',
      'home_compliance',
      'provider_compliance',
      'quality',
      'reg44',
      'reg45',
      'documents',
      'manual_review'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.document_intelligence_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  attachment_id uuid NULL REFERENCES public.universal_record_attachments(id) ON DELETE SET NULL,
  source_record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  file_name text NULL,
  mime_type text NULL,
  source_text text NULL,

  status document_intelligence_status NOT NULL DEFAULT 'queued',
  detected_category document_intelligence_category NOT NULL DEFAULT 'other',
  detected_title text NULL,
  document_date date NULL,
  effective_date date NULL,
  expiry_date date NULL,
  review_date date NULL,
  next_action_date date NULL,

  summary text NULL,
  key_information text NULL,
  child_voice text NULL,
  professional_recommendations text NULL,
  safeguarding_summary text NULL,
  education_summary text NULL,
  health_summary text NULL,
  placement_summary text NULL,
  compliance_summary text NULL,

  confidence_score numeric(5,2) NULL,
  requires_human_review boolean NOT NULL DEFAULT false,
  review_reason text NULL,

  created_by int4 NULL,
  reviewed_by int4 NULL,
  reviewed_at timestamptz NULL,
  routed_at timestamptz NULL,
  completed_at timestamptz NULL,
  failed_reason text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_document_intel_jobs_attachment ON public.document_intelligence_jobs(attachment_id);
CREATE INDEX IF NOT EXISTS idx_document_intel_jobs_child ON public.document_intelligence_jobs(young_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_intel_jobs_home ON public.document_intelligence_jobs(home_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_intel_jobs_provider ON public.document_intelligence_jobs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_intel_jobs_status ON public.document_intelligence_jobs(status);
CREATE INDEX IF NOT EXISTS idx_document_intel_jobs_expiry ON public.document_intelligence_jobs(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_intel_jobs_review ON public.document_intelligence_jobs(review_date) WHERE review_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.document_intelligence_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.document_intelligence_jobs(id) ON DELETE CASCADE,

  route_target document_route_target NOT NULL DEFAULT 'documents',
  target_table text NULL,
  target_record_id text NULL,
  route_title text NOT NULL,
  route_summary text NULL,
  extracted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  routed boolean NOT NULL DEFAULT false,
  routed_by int4 NULL,
  routed_at timestamptz NULL,
  route_error text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_document_intel_routes_job ON public.document_intelligence_routes(job_id);
CREATE INDEX IF NOT EXISTS idx_document_intel_routes_target ON public.document_intelligence_routes(route_target);

CREATE TABLE IF NOT EXISTS public.document_expiry_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.document_intelligence_jobs(id) ON DELETE CASCADE,
  attachment_id uuid NULL REFERENCES public.universal_record_attachments(id) ON DELETE SET NULL,
  task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE SET NULL,

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  reminder_type text NOT NULL DEFAULT 'document_expiry',
  title text NOT NULL,
  description text NULL,
  reminder_date date NOT NULL,
  due_date date NULL,
  priority universal_task_priority NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',

  sent_at timestamptz NULL,
  completed_at timestamptz NULL,
  completed_by int4 NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_document_expiry_reminders_job ON public.document_expiry_reminders(job_id);
CREATE INDEX IF NOT EXISTS idx_document_expiry_reminders_date ON public.document_expiry_reminders(reminder_date, status);
CREATE INDEX IF NOT EXISTS idx_document_expiry_reminders_child ON public.document_expiry_reminders(young_person_id, reminder_date);
CREATE INDEX IF NOT EXISTS idx_document_expiry_reminders_home ON public.document_expiry_reminders(home_id, reminder_date);

CREATE TABLE IF NOT EXISTS public.document_intelligence_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NULL REFERENCES public.document_intelligence_jobs(id) ON DELETE CASCADE,
  route_id uuid NULL REFERENCES public.document_intelligence_routes(id) ON DELETE SET NULL,
  reminder_id uuid NULL REFERENCES public.document_expiry_reminders(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  event_summary text NULL,
  actor_id int4 NULL,
  before_snapshot jsonb NULL,
  after_snapshot jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_intel_audit_job ON public.document_intelligence_audit_events(job_id);
CREATE INDEX IF NOT EXISTS idx_document_intel_audit_created ON public.document_intelligence_audit_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.document_intelligence_create_task_for_reminder(
  p_reminder_id uuid,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_reminder public.document_expiry_reminders%ROWTYPE;
  v_task_id uuid;
BEGIN
  SELECT * INTO v_reminder FROM public.document_expiry_reminders WHERE id = p_reminder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document reminder not found: %', p_reminder_id;
  END IF;

  INSERT INTO public.universal_tasks (
    provider_id, home_id, young_person_id, staff_id, adult_id,
    task_type, title, description, recommended_action,
    priority, due_at, safeguarding_relevant, inspection_relevant,
    source_table, source_id, created_by, metadata
  )
  VALUES (
    v_reminder.provider_id, v_reminder.home_id, v_reminder.young_person_id, v_reminder.staff_id, v_reminder.adult_id,
    v_reminder.reminder_type, v_reminder.title, v_reminder.description,
    'Review document, update record area if required, and replace/renew before expiry or review date.',
    v_reminder.priority, v_reminder.due_date::timestamptz, false, true,
    'document_expiry_reminders', v_reminder.id::text, p_created_by,
    jsonb_build_object('document_intelligence_job_id', v_reminder.job_id, 'attachment_id', v_reminder.attachment_id)
  )
  RETURNING id INTO v_task_id;

  UPDATE public.document_expiry_reminders
  SET task_id = v_task_id
  WHERE id = p_reminder_id;

  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_document_intelligence_queue AS
SELECT
  j.*,
  count(r.id) AS route_count,
  count(r.id) FILTER (WHERE r.routed) AS routed_count,
  count(rem.id) AS reminder_count,
  min(rem.reminder_date) FILTER (WHERE rem.status = 'open') AS next_reminder_date
FROM public.document_intelligence_jobs j
LEFT JOIN public.document_intelligence_routes r ON r.job_id = j.id
LEFT JOIN public.document_expiry_reminders rem ON rem.job_id = j.id
GROUP BY j.id;

CREATE OR REPLACE VIEW public.vw_document_expiry_dashboard AS
SELECT
  provider_id,
  home_id,
  young_person_id,
  staff_id,
  count(*) FILTER (WHERE status = 'open') AS open_reminders,
  count(*) FILTER (WHERE status = 'open' AND reminder_date <= current_date) AS due_now,
  count(*) FILTER (WHERE status = 'open' AND reminder_date <= current_date + 30) AS due_next_30_days,
  count(*) FILTER (WHERE status = 'open' AND reminder_date <= current_date + 60) AS due_next_60_days,
  min(reminder_date) FILTER (WHERE status = 'open') AS next_reminder_date
FROM public.document_expiry_reminders
GROUP BY provider_id, home_id, young_person_id, staff_id;

CREATE OR REPLACE VIEW public.vw_child_document_intelligence AS
SELECT
  j.id,
  j.attachment_id,
  j.home_id,
  j.young_person_id,
  j.file_name,
  j.detected_category::text AS detected_category,
  j.detected_title,
  j.document_date,
  j.effective_date,
  j.expiry_date,
  j.review_date,
  j.summary,
  j.key_information,
  j.education_summary,
  j.health_summary,
  j.placement_summary,
  j.safeguarding_summary,
  j.status,
  j.requires_human_review,
  j.created_at,
  count(r.id) AS route_count,
  count(rem.id) AS reminder_count
FROM public.document_intelligence_jobs j
LEFT JOIN public.document_intelligence_routes r ON r.job_id = j.id
LEFT JOIN public.document_expiry_reminders rem ON rem.job_id = j.id
WHERE j.young_person_id IS NOT NULL
GROUP BY j.id;
