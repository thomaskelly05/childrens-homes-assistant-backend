-- IndiCare OS Command Regulation 40 and missing-from-care workflows
-- Adds regulated safeguarding workflow foundations for notifiable events and missing episodes.

DO $$ BEGIN
  CREATE TYPE os_notification_status AS ENUM ('draft','required','sent','not_required','cancelled','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_missing_episode_status AS ENUM ('open','located','returned','closed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_reg40_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  source_table text,
  source_id int8,
  notification_reason text NOT NULL,
  status os_notification_status NOT NULL DEFAULT 'draft',
  decision text,
  decision_rationale text,
  decided_by int4,
  decided_at timestamptz,
  ofsted_notified_at timestamptz,
  placing_authority_notified_at timestamptz,
  social_worker_notified_at timestamptz,
  police_notified_at timestamptz,
  parents_or_carers_notified_at timestamptz,
  other_notifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_table, source_id, notification_reason)
);

CREATE TABLE IF NOT EXISTS public.os_missing_from_care_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  source_table text,
  source_id int8,
  status os_missing_episode_status NOT NULL DEFAULT 'open',
  missing_from timestamptz NOT NULL,
  located_at timestamptz,
  returned_at timestamptz,
  police_reference text,
  risk_level text CHECK (risk_level IS NULL OR risk_level IN ('low','medium','high','critical')),
  known_location text,
  circumstances text,
  immediate_actions text,
  police_notified_at timestamptz,
  social_worker_notified_at timestamptz,
  placing_authority_notified_at timestamptz,
  parents_or_carers_notified_at timestamptz,
  return_home_interview_due_at timestamptz,
  return_home_interview_completed_at timestamptz,
  risk_review_due_at timestamptz,
  risk_review_completed_at timestamptz,
  reg40_notification_id uuid REFERENCES public.os_reg40_notifications(id) ON DELETE SET NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_os_reg40_home_status ON public.os_reg40_notifications(home_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_os_reg40_source ON public.os_reg40_notifications(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_os_missing_home_status ON public.os_missing_from_care_workflows(home_id, status, missing_from DESC);
CREATE INDEX IF NOT EXISTS idx_os_missing_yp_status ON public.os_missing_from_care_workflows(young_person_id, status, missing_from DESC);

CREATE OR REPLACE FUNCTION public.touch_os_reg40_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'sent' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_os_reg40 ON public.os_reg40_notifications;
CREATE TRIGGER trg_touch_os_reg40
BEFORE UPDATE ON public.os_reg40_notifications
FOR EACH ROW EXECUTE FUNCTION public.touch_os_reg40_updated_at();

CREATE OR REPLACE FUNCTION public.touch_os_missing_workflow_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'returned' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.returned_at IS NULL THEN NEW.returned_at = now(); END IF;
    IF NEW.return_home_interview_due_at IS NULL THEN NEW.return_home_interview_due_at = NEW.returned_at + interval '72 hours'; END IF;
    IF NEW.risk_review_due_at IS NULL THEN NEW.risk_review_due_at = NEW.returned_at + interval '24 hours'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_os_missing_workflow ON public.os_missing_from_care_workflows;
CREATE TRIGGER trg_touch_os_missing_workflow
BEFORE UPDATE ON public.os_missing_from_care_workflows
FOR EACH ROW EXECUTE FUNCTION public.touch_os_missing_workflow_updated_at();

CREATE OR REPLACE FUNCTION public.os_reg40_create_from_command(
  p_command_item_id uuid,
  p_reason text,
  p_required boolean DEFAULT true,
  p_user_id int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_item public.os_command_items%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_item FROM public.os_command_items WHERE id = p_command_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Command item not found: %', p_command_item_id;
  END IF;

  INSERT INTO public.os_reg40_notifications (
    provider_id, home_id, young_person_id, command_item_id, source_table, source_id,
    notification_reason, status, due_at, evidence_refs, created_by
  ) VALUES (
    v_item.provider_id,
    v_item.home_id,
    v_item.young_person_id,
    p_command_item_id,
    v_item.source_table,
    v_item.source_id,
    p_reason,
    CASE WHEN p_required THEN 'required'::os_notification_status ELSE 'not_required'::os_notification_status END,
    CASE WHEN p_required THEN now() + interval '24 hours' ELSE NULL END,
    v_item.evidence_refs,
    p_user_id
  )
  ON CONFLICT (source_table, source_id, notification_reason) DO UPDATE SET
    command_item_id = EXCLUDED.command_item_id,
    status = EXCLUDED.status,
    due_at = coalesce(EXCLUDED.due_at, public.os_reg40_notifications.due_at),
    updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.os_chronology_add_event(
    'reg40_decision',
    'Regulation 40 decision: ' || p_reason,
    CASE WHEN p_required THEN 'Regulation 40 notification required.' ELSE 'Regulation 40 notification not required.' END,
    v_item.provider_id,
    v_item.home_id,
    v_item.young_person_id,
    v_item.staff_id,
    now(),
    'os_reg40_notifications',
    NULL,
    p_command_item_id,
    'helped_and_protected',
    ARRAY['Regulation 40'],
    v_item.evidence_refs,
    'manager',
    false,
    p_user_id,
    jsonb_build_object('reg40_notification_id', v_id)
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_missing_create_workflow(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_missing_from timestamptz,
  p_risk_level text DEFAULT 'high',
  p_circumstances text DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id int8 DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_command_id uuid;
  v_workflow_id uuid;
  v_reg40_id uuid;
BEGIN
  v_command_id := public.os_command_create_manual_item(
    'missing_episode_review',
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    coalesce(p_circumstances, 'Missing-from-care episode requires immediate oversight.'),
    p_source_table,
    p_source_id,
    now() + interval '1 hour',
    p_created_by,
    jsonb_build_object('risk_level', p_risk_level, 'missing_from', p_missing_from)
  );

  INSERT INTO public.os_missing_from_care_workflows (
    provider_id, home_id, young_person_id, command_item_id, source_table, source_id,
    status, missing_from, risk_level, circumstances, police_notified_at, social_worker_notified_at,
    return_home_interview_due_at, risk_review_due_at, created_by
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_young_person_id,
    v_command_id,
    p_source_table,
    p_source_id,
    'open',
    p_missing_from,
    p_risk_level,
    p_circumstances,
    NULL,
    NULL,
    NULL,
    now() + interval '24 hours',
    p_created_by
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    command_item_id = EXCLUDED.command_item_id,
    status = 'open',
    risk_level = EXCLUDED.risk_level,
    circumstances = EXCLUDED.circumstances,
    updated_at = now()
  RETURNING id INTO v_workflow_id;

  IF p_risk_level IN ('high','critical') THEN
    v_reg40_id := public.os_reg40_create_from_command(v_command_id, 'Missing from care episode', true, p_created_by);
    UPDATE public.os_missing_from_care_workflows SET reg40_notification_id = v_reg40_id WHERE id = v_workflow_id;
  END IF;

  PERFORM public.os_chronology_add_event(
    'missing_from_care_started',
    'Missing from care episode started',
    coalesce(p_circumstances, 'Young person recorded as missing from care.'),
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    p_missing_from,
    'os_missing_from_care_workflows',
    NULL,
    v_command_id,
    'helped_and_protected',
    ARRAY['Missing from care','Regulation 40'],
    jsonb_build_array(jsonb_build_object('table', coalesce(p_source_table, 'os_missing_from_care_workflows'), 'id', coalesce(p_source_id, 0))),
    'manager',
    true,
    p_created_by,
    jsonb_build_object('missing_workflow_id', v_workflow_id, 'risk_level', p_risk_level)
  );

  RETURN v_workflow_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_missing_mark_returned(
  p_workflow_id uuid,
  p_returned_at timestamptz DEFAULT now(),
  p_police_reference text DEFAULT NULL,
  p_user_id int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_workflow public.os_missing_from_care_workflows%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT * INTO v_workflow FROM public.os_missing_from_care_workflows WHERE id = p_workflow_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Missing workflow not found: %', p_workflow_id;
  END IF;

  UPDATE public.os_missing_from_care_workflows
  SET status = 'returned',
      returned_at = coalesce(p_returned_at, now()),
      police_reference = coalesce(p_police_reference, police_reference),
      return_home_interview_due_at = coalesce(return_home_interview_due_at, coalesce(p_returned_at, now()) + interval '72 hours'),
      risk_review_due_at = coalesce(risk_review_due_at, coalesce(p_returned_at, now()) + interval '24 hours')
  WHERE id = p_workflow_id;

  v_event_id := public.os_chronology_add_event(
    'missing_from_care_returned',
    'Young person returned from missing episode',
    'Young person returned. Return-home interview and risk review should be completed.',
    v_workflow.provider_id,
    v_workflow.home_id,
    v_workflow.young_person_id,
    NULL,
    coalesce(p_returned_at, now()),
    'os_missing_from_care_workflows',
    NULL,
    v_workflow.command_item_id,
    'helped_and_protected',
    ARRAY['Missing from care'],
    v_workflow.evidence_refs,
    'manager',
    true,
    p_user_id,
    jsonb_build_object('missing_workflow_id', p_workflow_id, 'police_reference', p_police_reference)
  );

  PERFORM public.os_command_create_manual_item(
    'risk_review_due',
    v_workflow.provider_id,
    v_workflow.home_id,
    v_workflow.young_person_id,
    NULL,
    'Missing episode has ended. Risk assessment and missing-from-care plan require review.',
    'os_missing_from_care_workflows',
    NULL,
    coalesce(p_returned_at, now()) + interval '24 hours',
    p_user_id,
    jsonb_build_object('missing_workflow_id', p_workflow_id)
  );

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_missing_from_care_board AS
SELECT
  m.id,
  m.provider_id,
  m.home_id,
  m.young_person_id,
  m.command_item_id,
  m.status::text AS status,
  m.risk_level,
  m.missing_from,
  m.located_at,
  m.returned_at,
  m.police_reference,
  m.return_home_interview_due_at,
  m.return_home_interview_completed_at,
  m.risk_review_due_at,
  m.risk_review_completed_at,
  m.reg40_notification_id,
  r.status::text AS reg40_status,
  CASE
    WHEN m.status IN ('open','located') THEN 'active_missing_episode'
    WHEN m.status = 'returned' AND m.return_home_interview_completed_at IS NULL AND m.return_home_interview_due_at < now() THEN 'return_home_interview_overdue'
    WHEN m.status = 'returned' AND m.risk_review_completed_at IS NULL AND m.risk_review_due_at < now() THEN 'risk_review_overdue'
    ELSE 'monitor'
  END AS board_state
FROM public.os_missing_from_care_workflows m
LEFT JOIN public.os_reg40_notifications r ON r.id = m.reg40_notification_id;

CREATE OR REPLACE VIEW public.vw_os_reg40_board AS
SELECT
  r.id,
  r.provider_id,
  r.home_id,
  r.young_person_id,
  r.command_item_id,
  r.notification_reason,
  r.status::text AS status,
  r.due_at,
  r.ofsted_notified_at,
  r.placing_authority_notified_at,
  r.social_worker_notified_at,
  r.police_notified_at,
  r.completed_at,
  CASE
    WHEN r.status = 'required' AND r.due_at < now() THEN 'overdue'
    WHEN r.status = 'required' THEN 'required'
    WHEN r.status = 'sent' THEN 'sent'
    ELSE r.status::text
  END AS board_state,
  r.created_at,
  r.updated_at
FROM public.os_reg40_notifications r;
