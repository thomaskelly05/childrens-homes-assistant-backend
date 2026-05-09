-- IndiCare Reg 44 Report Reader
-- Ingests Reg 44 visitor reports and extracts evidence, actions, good practice,
-- safeguarding themes and provider-learning points for Reg 45 and compliance oversight.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reg44_reader_status') THEN
    CREATE TYPE reg44_reader_status AS ENUM (
      'uploaded',
      'processing',
      'analysed',
      'reviewed',
      'approved',
      'archived',
      'failed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reg44_evidence_type') THEN
    CREATE TYPE reg44_evidence_type AS ENUM (
      'good_practice',
      'shortfall',
      'safeguarding',
      'leadership_management',
      'care_planning',
      'voice_of_child',
      'staffing',
      'health',
      'education',
      'environment',
      'records',
      'professional_feedback',
      'family_feedback',
      'action_progress',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reg44_action_status') THEN
    CREATE TYPE reg44_action_status AS ENUM (
      'open',
      'in_progress',
      'completed',
      'overdue',
      'cancelled',
      'carried_forward'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reg44_report_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id int4 NULL,
  home_id int4 NOT NULL,
  report_month date NULL,
  visit_date date NULL,

  title text NOT NULL,
  visitor_name text NULL,
  visitor_role text NULL,

  source_attachment_id uuid NULL REFERENCES public.universal_record_attachments(id) ON DELETE SET NULL,
  source_file_name text NULL,
  source_file_url text NULL,
  source_text text NULL,

  status reg44_reader_status NOT NULL DEFAULT 'uploaded',
  analysis_summary text NULL,
  safeguarding_summary text NULL,
  good_practice_summary text NULL,
  shortfalls_summary text NULL,
  provider_learning_summary text NULL,
  reg45_relevance_summary text NULL,

  confidence_score numeric(5,2) NULL,
  reviewed_by int4 NULL,
  reviewed_at timestamptz NULL,
  approved_by int4 NULL,
  approved_at timestamptz NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reg44_imports_home ON public.reg44_report_imports(home_id, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_reg44_imports_provider ON public.reg44_report_imports(provider_id, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_reg44_imports_status ON public.reg44_report_imports(status);

CREATE TABLE IF NOT EXISTS public.reg44_report_evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  report_import_id uuid NOT NULL REFERENCES public.reg44_report_imports(id) ON DELETE CASCADE,
  provider_id int4 NULL,
  home_id int4 NOT NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,

  evidence_type reg44_evidence_type NOT NULL DEFAULT 'other',
  sccif_area text NULL,
  regulation_reference text NULL,
  quality_standard text NULL,

  title text NOT NULL,
  evidence_text text NOT NULL,
  analysis text NULL,
  impact_on_children text NULL,
  good_practice text NULL,
  shortfall text NULL,
  safeguarding_relevance text NULL,
  management_oversight text NULL,

  source_quote text NULL,
  source_section text NULL,
  source_page text NULL,

  positive boolean NOT NULL DEFAULT false,
  requires_action boolean NOT NULL DEFAULT false,
  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT true,
  reg45_relevant boolean NOT NULL DEFAULT false,
  provider_learning_relevant boolean NOT NULL DEFAULT false,

  confidence_score numeric(5,2) NULL,
  reviewer_comment text NULL,
  accepted boolean NULL,

  linked_record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,
  linked_task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE SET NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reg44_evidence_import ON public.reg44_report_evidence_items(report_import_id);
CREATE INDEX IF NOT EXISTS idx_reg44_evidence_home ON public.reg44_report_evidence_items(home_id);
CREATE INDEX IF NOT EXISTS idx_reg44_evidence_child ON public.reg44_report_evidence_items(young_person_id);
CREATE INDEX IF NOT EXISTS idx_reg44_evidence_type ON public.reg44_report_evidence_items(evidence_type);
CREATE INDEX IF NOT EXISTS idx_reg44_evidence_safeguarding ON public.reg44_report_evidence_items(safeguarding_relevant) WHERE safeguarding_relevant = true;
CREATE INDEX IF NOT EXISTS idx_reg44_evidence_reg45 ON public.reg44_report_evidence_items(reg45_relevant) WHERE reg45_relevant = true;

CREATE TABLE IF NOT EXISTS public.reg44_report_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  report_import_id uuid NOT NULL REFERENCES public.reg44_report_imports(id) ON DELETE CASCADE,
  evidence_item_id uuid NULL REFERENCES public.reg44_report_evidence_items(id) ON DELETE SET NULL,

  provider_id int4 NULL,
  home_id int4 NOT NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,

  title text NOT NULL,
  action_text text NOT NULL,
  rationale text NULL,
  expected_outcome text NULL,
  responsible_person text NULL,
  assigned_to int4 NULL,
  assigned_role text NULL,

  priority universal_task_priority NOT NULL DEFAULT 'normal',
  status reg44_action_status NOT NULL DEFAULT 'open',

  due_date date NULL,
  completed_at timestamptz NULL,
  completed_by int4 NULL,
  completion_evidence text NULL,

  carried_forward_from_action_id uuid NULL REFERENCES public.reg44_report_actions(id) ON DELETE SET NULL,
  linked_task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE SET NULL,
  linked_record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT true,
  reg45_relevant boolean NOT NULL DEFAULT false,
  provider_learning_relevant boolean NOT NULL DEFAULT false,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reg44_actions_import ON public.reg44_report_actions(report_import_id);
CREATE INDEX IF NOT EXISTS idx_reg44_actions_home ON public.reg44_report_actions(home_id);
CREATE INDEX IF NOT EXISTS idx_reg44_actions_status ON public.reg44_report_actions(status);
CREATE INDEX IF NOT EXISTS idx_reg44_actions_due ON public.reg44_report_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_reg44_actions_reg45 ON public.reg44_report_actions(reg45_relevant) WHERE reg45_relevant = true;

CREATE TABLE IF NOT EXISTS public.reg44_report_reader_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_import_id uuid NULL REFERENCES public.reg44_report_imports(id) ON DELETE CASCADE,
  evidence_item_id uuid NULL REFERENCES public.reg44_report_evidence_items(id) ON DELETE SET NULL,
  action_id uuid NULL REFERENCES public.reg44_report_actions(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  event_summary text NULL,
  actor_id int4 NULL,
  before_snapshot jsonb NULL,
  after_snapshot jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg44_reader_audit_import ON public.reg44_report_reader_audit_events(report_import_id);
CREATE INDEX IF NOT EXISTS idx_reg44_reader_audit_created ON public.reg44_report_reader_audit_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.reg44_create_import(
  p_home_id int4,
  p_title text,
  p_provider_id int4 DEFAULT NULL,
  p_report_month date DEFAULT NULL,
  p_visit_date date DEFAULT NULL,
  p_visitor_name text DEFAULT NULL,
  p_visitor_role text DEFAULT NULL,
  p_source_attachment_id uuid DEFAULT NULL,
  p_source_file_name text DEFAULT NULL,
  p_source_file_url text DEFAULT NULL,
  p_source_text text DEFAULT NULL,
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_import_id uuid;
BEGIN
  INSERT INTO public.reg44_report_imports (
    provider_id, home_id, report_month, visit_date, title, visitor_name, visitor_role,
    source_attachment_id, source_file_name, source_file_url, source_text,
    created_by, metadata
  )
  VALUES (
    p_provider_id, p_home_id, p_report_month, p_visit_date, p_title, p_visitor_name, p_visitor_role,
    p_source_attachment_id, p_source_file_name, p_source_file_url, p_source_text,
    p_created_by, COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_import_id;

  INSERT INTO public.reg44_report_reader_audit_events (
    report_import_id, event_type, event_summary, actor_id, after_snapshot
  ) VALUES (
    v_import_id, 'import_created', 'Reg 44 report import created', p_created_by,
    jsonb_build_object('title', p_title, 'home_id', p_home_id, 'report_month', p_report_month)
  );

  RETURN v_import_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reg44_create_universal_task_from_action(
  p_action_id uuid,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_action public.reg44_report_actions%ROWTYPE;
  v_task_id uuid;
BEGIN
  SELECT * INTO v_action FROM public.reg44_report_actions WHERE id = p_action_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reg 44 action not found: %', p_action_id;
  END IF;

  INSERT INTO public.universal_tasks (
    provider_id, home_id, young_person_id, staff_id,
    record_id, task_type, title, description, recommended_action,
    priority, due_at, assigned_to, assigned_role,
    safeguarding_relevant, inspection_relevant, manager_review_related,
    source_table, source_id, created_by, metadata
  )
  VALUES (
    v_action.provider_id, v_action.home_id, v_action.young_person_id, v_action.staff_id,
    v_action.linked_record_id, 'reg44_action', v_action.title, v_action.rationale, v_action.action_text,
    v_action.priority, CASE WHEN v_action.due_date IS NOT NULL THEN v_action.due_date::timestamptz ELSE NULL END,
    v_action.assigned_to, v_action.assigned_role,
    v_action.safeguarding_relevant, v_action.inspection_relevant, true,
    'reg44_report_actions', v_action.id::text, p_created_by,
    jsonb_build_object('reg44_action_id', v_action.id, 'report_import_id', v_action.report_import_id)
  )
  RETURNING id INTO v_task_id;

  UPDATE public.reg44_report_actions
  SET linked_task_id = v_task_id, updated_at = now()
  WHERE id = p_action_id;

  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_reg44_report_evidence_table AS
SELECT
  e.id,
  e.report_import_id,
  i.title AS report_title,
  i.report_month,
  i.visit_date,
  i.visitor_name,
  e.provider_id,
  e.home_id,
  e.young_person_id,
  e.evidence_type::text AS evidence_type,
  e.sccif_area,
  e.regulation_reference,
  e.quality_standard,
  e.title,
  e.evidence_text,
  e.analysis,
  e.impact_on_children,
  e.good_practice,
  e.shortfall,
  e.safeguarding_relevance,
  e.management_oversight,
  e.positive,
  e.requires_action,
  e.safeguarding_relevant,
  e.inspection_relevant,
  e.reg45_relevant,
  e.provider_learning_relevant,
  e.confidence_score,
  e.accepted,
  e.linked_record_id,
  e.linked_task_id,
  e.created_at
FROM public.reg44_report_evidence_items e
JOIN public.reg44_report_imports i ON i.id = e.report_import_id;

CREATE OR REPLACE VIEW public.vw_reg44_actions_table AS
SELECT
  a.*,
  i.title AS report_title,
  i.report_month,
  i.visit_date,
  e.title AS evidence_title,
  CASE
    WHEN a.status IN ('completed','cancelled') THEN a.status::text
    WHEN a.due_date IS NOT NULL AND a.due_date < current_date THEN 'overdue'
    ELSE a.status::text
  END AS action_state
FROM public.reg44_report_actions a
JOIN public.reg44_report_imports i ON i.id = a.report_import_id
LEFT JOIN public.reg44_report_evidence_items e ON e.id = a.evidence_item_id;

CREATE OR REPLACE VIEW public.vw_reg44_to_reg45_learning_feed AS
SELECT
  'evidence' AS item_source,
  id,
  report_import_id,
  provider_id,
  home_id,
  young_person_id,
  title,
  evidence_text AS content,
  analysis,
  sccif_area,
  regulation_reference,
  safeguarding_relevant,
  provider_learning_relevant,
  reg45_relevant,
  created_at
FROM public.reg44_report_evidence_items
WHERE reg45_relevant = true OR provider_learning_relevant = true
UNION ALL
SELECT
  'action' AS item_source,
  id,
  report_import_id,
  provider_id,
  home_id,
  young_person_id,
  title,
  action_text AS content,
  rationale AS analysis,
  NULL AS sccif_area,
  NULL AS regulation_reference,
  safeguarding_relevant,
  provider_learning_relevant,
  reg45_relevant,
  created_at
FROM public.reg44_report_actions
WHERE reg45_relevant = true OR provider_learning_relevant = true;

CREATE OR REPLACE VIEW public.vw_home_reg44_dashboard AS
SELECT
  i.home_id,
  count(DISTINCT i.id) AS report_imports,
  count(DISTINCT e.id) AS evidence_items,
  count(DISTINCT e.id) FILTER (WHERE e.positive) AS good_practice_items,
  count(DISTINCT e.id) FILTER (WHERE e.requires_action) AS shortfall_items,
  count(DISTINCT e.id) FILTER (WHERE e.safeguarding_relevant) AS safeguarding_items,
  count(DISTINCT a.id) AS actions_total,
  count(DISTINCT a.id) FILTER (WHERE a.status IN ('open','in_progress','carried_forward')) AS open_actions,
  count(DISTINCT a.id) FILTER (WHERE a.due_date < current_date AND a.status NOT IN ('completed','cancelled')) AS overdue_actions,
  max(i.created_at) AS latest_import_at
FROM public.reg44_report_imports i
LEFT JOIN public.reg44_report_evidence_items e ON e.report_import_id = i.id
LEFT JOIN public.reg44_report_actions a ON a.report_import_id = i.id
GROUP BY i.home_id;
