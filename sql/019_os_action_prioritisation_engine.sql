-- IndiCare OS intelligent action prioritisation engine
-- Ranks operational actions across safeguarding, risk, inspection, shift and workforce pressures.

DO $$ BEGIN
  CREATE TYPE os_action_priority_band AS ENUM ('immediate','today','this_week','monitor','defer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_action_priority_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE CASCADE,
  source_table text,
  source_id text,
  title text NOT NULL,
  rationale text,
  priority_band os_action_priority_band NOT NULL DEFAULT 'monitor',
  priority_score numeric(8,2) NOT NULL DEFAULT 0,
  safeguarding_weight numeric(8,2) NOT NULL DEFAULT 0,
  inspection_weight numeric(8,2) NOT NULL DEFAULT 0,
  overdue_weight numeric(8,2) NOT NULL DEFAULT 0,
  child_impact_weight numeric(8,2) NOT NULL DEFAULT 0,
  operational_weight numeric(8,2) NOT NULL DEFAULT 0,
  recommended_next_step text,
  assigned_to_user_id int4,
  assigned_to_staff_id int4,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (command_item_id, calculated_at)
);

CREATE INDEX IF NOT EXISTS idx_os_action_priority_home_band
  ON public.os_action_priority_snapshots(home_id, priority_band, priority_score DESC, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_action_priority_command
  ON public.os_action_priority_snapshots(command_item_id, calculated_at DESC);

CREATE OR REPLACE FUNCTION public.os_calculate_command_priority_score(
  p_command_item_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_item public.os_command_items%ROWTYPE;
  v_score numeric := 0;
BEGIN
  SELECT * INTO v_item FROM public.os_command_items WHERE id = p_command_item_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  v_score := v_score + CASE v_item.priority
    WHEN 'critical' THEN 50
    WHEN 'high' THEN 35
    WHEN 'medium' THEN 20
    WHEN 'low' THEN 10
    ELSE 5
  END;

  v_score := v_score + CASE
    WHEN v_item.due_at IS NOT NULL AND v_item.due_at < now() THEN 30
    WHEN v_item.due_at IS NOT NULL AND v_item.due_at < now() + interval '4 hours' THEN 20
    WHEN v_item.due_at IS NOT NULL AND v_item.due_at < now() + interval '24 hours' THEN 10
    ELSE 0
  END;

  v_score := v_score + CASE
    WHEN v_item.domain IN ('safeguarding','missing_from_care','reg40') THEN 25
    WHEN v_item.domain IN ('risk','medication') THEN 18
    WHEN v_item.domain IN ('quality','reg44','reg45','ofsted') THEN 14
    WHEN v_item.domain IN ('workforce','rota','handover') THEN 10
    ELSE 5
  END;

  v_score := v_score + CASE
    WHEN v_item.sccif_area = 'helped_and_protected' THEN 15
    WHEN v_item.sccif_area = 'leadership_management' THEN 10
    WHEN v_item.sccif_area = 'children_experiences_progress' THEN 8
    ELSE 0
  END;

  RETURN v_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_generate_action_priorities(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4 DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS int4
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int4 := 0;
BEGIN
  INSERT INTO public.os_action_priority_snapshots (
    provider_id,
    home_id,
    young_person_id,
    command_item_id,
    source_table,
    source_id,
    title,
    rationale,
    priority_band,
    priority_score,
    safeguarding_weight,
    inspection_weight,
    overdue_weight,
    child_impact_weight,
    operational_weight,
    recommended_next_step,
    assigned_to_user_id,
    assigned_to_staff_id,
    created_by,
    metadata
  )
  SELECT
    i.provider_id,
    i.home_id,
    i.young_person_id,
    i.id,
    i.source_table,
    i.source_id::text,
    i.title,
    concat_ws(' ',
      'Priority calculated from severity, due date, domain, SCCIF relevance and child impact.',
      CASE WHEN i.due_at < now() THEN 'This action is overdue.' ELSE NULL END,
      CASE WHEN i.domain IN ('safeguarding','missing_from_care','reg40') THEN 'Safeguarding domain increases priority.' ELSE NULL END
    ),
    CASE
      WHEN public.os_calculate_command_priority_score(i.id) >= 100 THEN 'immediate'::os_action_priority_band
      WHEN public.os_calculate_command_priority_score(i.id) >= 75 THEN 'today'::os_action_priority_band
      WHEN public.os_calculate_command_priority_score(i.id) >= 45 THEN 'this_week'::os_action_priority_band
      WHEN public.os_calculate_command_priority_score(i.id) >= 20 THEN 'monitor'::os_action_priority_band
      ELSE 'defer'::os_action_priority_band
    END,
    public.os_calculate_command_priority_score(i.id),
    CASE WHEN i.domain IN ('safeguarding','missing_from_care','reg40') THEN 25 ELSE 0 END,
    CASE WHEN i.domain IN ('quality','reg44','reg45','ofsted') OR i.sccif_area IS NOT NULL THEN 14 ELSE 0 END,
    CASE WHEN i.due_at IS NOT NULL AND i.due_at < now() THEN 30 ELSE 0 END,
    CASE WHEN i.young_person_id IS NOT NULL THEN 12 ELSE 0 END,
    CASE WHEN i.domain IN ('rota','handover','home_operations','workforce') THEN 10 ELSE 0 END,
    CASE
      WHEN i.domain = 'reg40' THEN 'Confirm notification status, evidence and management rationale.'
      WHEN i.domain = 'missing_from_care' THEN 'Confirm safety actions, return-home interview and risk review.'
      WHEN i.domain = 'safeguarding' THEN 'Review source record, record management oversight and update risk plan.'
      WHEN i.domain = 'medication' THEN 'Review MAR/health advice and record action taken.'
      WHEN i.domain = 'workforce' THEN 'Review safer staffing or compliance impact and assign owner.'
      ELSE coalesce(i.recommended_action, 'Review and assign next action.')
    END,
    i.assigned_to_user_id,
    i.assigned_to_staff_id,
    p_created_by,
    jsonb_build_object('generated_by','os_generate_action_priorities')
  FROM public.os_command_items i
  WHERE i.home_id = p_home_id
    AND (p_young_person_id IS NULL OR i.young_person_id = p_young_person_id)
    AND i.status IN ('open','in_progress','waiting');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.os_live_emit(
    'command.updated',
    'os_action_priority_snapshots',
    p_home_id::text,
    'Action priorities recalculated',
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    jsonb_build_object('generated_count', v_count),
    ARRAY['senior','manager','responsible_individual'],
    p_created_by
  );

  RETURN v_count;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_action_priority_board AS
SELECT DISTINCT ON (s.command_item_id)
  s.id,
  s.provider_id,
  s.home_id,
  s.young_person_id,
  s.command_item_id,
  s.source_table,
  s.source_id,
  s.title,
  s.rationale,
  s.priority_band::text AS priority_band,
  s.priority_score,
  s.safeguarding_weight,
  s.inspection_weight,
  s.overdue_weight,
  s.child_impact_weight,
  s.operational_weight,
  s.recommended_next_step,
  s.assigned_to_user_id,
  s.assigned_to_staff_id,
  c.domain::text AS domain,
  c.priority::text AS original_priority,
  c.status::text AS command_status,
  c.due_at,
  s.calculated_at,
  CASE
    WHEN s.priority_band = 'immediate' THEN 0
    WHEN s.priority_band = 'today' THEN 1
    WHEN s.priority_band = 'this_week' THEN 2
    WHEN s.priority_band = 'monitor' THEN 3
    ELSE 4
  END AS priority_sort
FROM public.os_action_priority_snapshots s
JOIN public.os_command_items c ON c.id = s.command_item_id
WHERE c.status IN ('open','in_progress','waiting')
ORDER BY s.command_item_id, s.calculated_at DESC;

CREATE OR REPLACE VIEW public.vw_os_action_priority_summary AS
SELECT
  provider_id,
  home_id,
  count(*) FILTER (WHERE priority_band='immediate') AS immediate_count,
  count(*) FILTER (WHERE priority_band='today') AS today_count,
  count(*) FILTER (WHERE priority_band='this_week') AS this_week_count,
  count(*) FILTER (WHERE priority_band='monitor') AS monitor_count,
  round(avg(priority_score), 2) AS avg_priority_score,
  max(calculated_at) AS latest_calculated_at
FROM public.vw_os_action_priority_board
GROUP BY provider_id, home_id;
