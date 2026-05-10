-- IndiCare OS Command compliance engines
-- Medication escalation, daily record integrity and workforce compliance.

DO $$ BEGIN
  CREATE TYPE os_medication_issue_status AS ENUM ('open','review_required','resolved','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_medication_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  source_table text,
  source_id int8,
  issue_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status os_medication_issue_status NOT NULL DEFAULT 'open',
  medication_name text,
  issue_summary text NOT NULL,
  action_taken text,
  pharmacist_contacted_at timestamptz,
  gp_contacted_at timestamptz,
  social_worker_notified_at timestamptz,
  manager_reviewed_at timestamptz,
  reviewed_by int4,
  due_at timestamptz,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_daily_record_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  shift_date date NOT NULL,
  shift_type text,
  expected_record_type text NOT NULL,
  gap_reason text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, young_person_id, shift_date, expected_record_type)
);

CREATE TABLE IF NOT EXISTS public.os_workforce_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  staff_id int4 NOT NULL,
  compliance_type text NOT NULL,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','warning','expired','missing')),
  title text NOT NULL,
  summary text,
  expires_at timestamptz,
  warning_at timestamptz,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  source_table text,
  source_id int8,
  reviewed_by int4,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (staff_id, compliance_type, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_os_medication_escalations_home_status ON public.os_medication_escalations(home_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_os_daily_record_gaps_home_date ON public.os_daily_record_gaps(home_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_os_workforce_compliance_status ON public.os_workforce_compliance(status, expires_at);

CREATE OR REPLACE FUNCTION public.os_medication_create_escalation(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_issue_type text,
  p_issue_summary text,
  p_severity text DEFAULT 'medium',
  p_medication_name text DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id int8 DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_command_id uuid;
  v_id uuid;
BEGIN
  v_command_id := public.os_command_create_manual_item(
    'medication_gap',
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    p_issue_summary,
    p_source_table,
    p_source_id,
    now() + interval '4 hours',
    p_created_by,
    jsonb_build_object('severity', p_severity, 'issue_type', p_issue_type)
  );

  INSERT INTO public.os_medication_escalations (
    provider_id,
    home_id,
    young_person_id,
    command_item_id,
    source_table,
    source_id,
    issue_type,
    severity,
    medication_name,
    issue_summary,
    due_at,
    created_by,
    evidence_refs
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_young_person_id,
    v_command_id,
    p_source_table,
    p_source_id,
    p_issue_type,
    p_severity,
    p_medication_name,
    p_issue_summary,
    now() + interval '4 hours',
    p_created_by,
    CASE WHEN p_source_table IS NOT NULL AND p_source_id IS NOT NULL
      THEN jsonb_build_array(jsonb_build_object('table', p_source_table, 'id', p_source_id))
      ELSE '[]'::jsonb
    END
  ) RETURNING id INTO v_id;

  PERFORM public.os_chronology_add_event(
    'medication_escalation',
    'Medication issue escalated',
    p_issue_summary,
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    now(),
    'os_medication_escalations',
    NULL,
    v_command_id,
    'helped_and_protected',
    ARRAY['Medication','Health'],
    jsonb_build_array(jsonb_build_object('table', coalesce(p_source_table, 'os_medication_escalations'), 'id', coalesce(p_source_id, 0))),
    'manager',
    true,
    p_created_by,
    jsonb_build_object('severity', p_severity)
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_daily_record_gap_detected(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_shift_date date,
  p_expected_record_type text,
  p_shift_type text DEFAULT NULL,
  p_gap_reason text DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_command_id uuid;
  v_id uuid;
BEGIN
  v_command_id := public.os_command_create_manual_item(
    'daily_note_gap',
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    coalesce(p_gap_reason, 'Expected daily record was not completed.'),
    'os_daily_record_gaps',
    NULL,
    now() + interval '8 hours',
    p_created_by,
    jsonb_build_object('shift_date', p_shift_date, 'record_type', p_expected_record_type)
  );

  INSERT INTO public.os_daily_record_gaps (
    provider_id,
    home_id,
    young_person_id,
    command_item_id,
    shift_date,
    shift_type,
    expected_record_type,
    gap_reason,
    metadata
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_young_person_id,
    v_command_id,
    p_shift_date,
    p_shift_type,
    p_expected_record_type,
    p_gap_reason,
    jsonb_build_object('generated_by', 'os_command')
  )
  ON CONFLICT (home_id, young_person_id, shift_date, expected_record_type) DO UPDATE SET
    gap_reason = EXCLUDED.gap_reason
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_workforce_register_issue(
  p_provider_id int4,
  p_home_id int4,
  p_staff_id int4,
  p_compliance_type text,
  p_status text,
  p_title text,
  p_summary text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id int8 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_command_id uuid;
  v_id uuid;
BEGIN
  IF p_status IN ('warning','expired','missing') THEN
    v_command_id := public.os_command_create_manual_item(
      'staff_training_expiry',
      p_provider_id,
      p_home_id,
      NULL,
      p_staff_id,
      coalesce(p_summary, p_title),
      p_source_table,
      p_source_id,
      coalesce(p_expires_at, now() + interval '7 days'),
      NULL,
      jsonb_build_object('compliance_type', p_compliance_type, 'status', p_status)
    );
  END IF;

  INSERT INTO public.os_workforce_compliance (
    provider_id,
    home_id,
    staff_id,
    compliance_type,
    status,
    title,
    summary,
    expires_at,
    warning_at,
    command_item_id,
    source_table,
    source_id
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_staff_id,
    p_compliance_type,
    p_status,
    p_title,
    p_summary,
    p_expires_at,
    CASE WHEN p_expires_at IS NOT NULL THEN p_expires_at - interval '30 days' ELSE NULL END,
    v_command_id,
    p_source_table,
    p_source_id
  )
  ON CONFLICT (staff_id, compliance_type, source_table, source_id) DO UPDATE SET
    status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_compliance_board AS
SELECT
  'medication' AS board,
  m.id::text AS item_id,
  m.home_id,
  m.young_person_id,
  NULL::int4 AS staff_id,
  m.status::text AS status,
  m.severity AS priority,
  m.issue_summary AS title,
  m.due_at,
  m.created_at
FROM public.os_medication_escalations m

UNION ALL

SELECT
  'daily_record_gap' AS board,
  g.id::text AS item_id,
  g.home_id,
  g.young_person_id,
  NULL::int4 AS staff_id,
  CASE WHEN g.resolved THEN 'resolved' ELSE 'open' END AS status,
  'medium' AS priority,
  'Daily record gap: ' || g.expected_record_type AS title,
  NULL::timestamptz AS due_at,
  g.created_at
FROM public.os_daily_record_gaps g

UNION ALL

SELECT
  'workforce' AS board,
  w.id::text AS item_id,
  w.home_id,
  NULL::int4 AS young_person_id,
  w.staff_id,
  w.status,
  CASE WHEN w.status IN ('expired','missing') THEN 'high' ELSE 'medium' END AS priority,
  w.title,
  w.expires_at AS due_at,
  w.created_at
FROM public.os_workforce_compliance w;
