-- IndiCare OS provider-wide operational command centre
-- Consolidates operational command, safeguarding intelligence, risk, inspection readiness and workforce resilience.

CREATE TABLE IF NOT EXISTS public.os_provider_command_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  total_homes int4 NOT NULL DEFAULT 0,
  urgent_homes int4 NOT NULL DEFAULT 0,
  critical_commands int4 NOT NULL DEFAULT 0,
  immediate_actions int4 NOT NULL DEFAULT 0,
  active_missing_episodes int4 NOT NULL DEFAULT 0,
  overdue_reg40_count int4 NOT NULL DEFAULT 0,
  high_risk_patterns int4 NOT NULL DEFAULT 0,
  critical_risk_snapshots int4 NOT NULL DEFAULT 0,
  low_resilience_homes int4 NOT NULL DEFAULT 0,
  inspection_urgent_homes int4 NOT NULL DEFAULT 0,
  average_quality_score numeric(6,2),
  average_resilience_score numeric(6,2),
  command_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  safeguarding_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  inspection_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  workforce_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  leadership_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_provider_command_snapshots_provider_created
  ON public.os_provider_command_snapshots(provider_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.os_generate_provider_command_snapshot(
  p_provider_id int4 DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_homes int4 := 0;
  v_urgent_homes int4 := 0;
  v_critical_commands int4 := 0;
  v_immediate_actions int4 := 0;
  v_active_missing int4 := 0;
  v_reg40_overdue int4 := 0;
  v_high_patterns int4 := 0;
  v_critical_risk int4 := 0;
  v_low_resilience int4 := 0;
  v_inspection_urgent int4 := 0;
  v_avg_quality numeric;
  v_avg_resilience numeric;
  v_id uuid;
BEGIN
  SELECT count(DISTINCT home_id) INTO v_total_homes
  FROM public.os_command_items
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id);

  SELECT count(*) INTO v_urgent_homes
  FROM public.vw_os_provider_oversight
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id)
    AND oversight_state IN ('critical','high');

  SELECT count(*) INTO v_critical_commands
  FROM public.os_command_items
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id)
    AND status IN ('open','in_progress','waiting')
    AND priority = 'critical';

  SELECT count(*) INTO v_immediate_actions
  FROM public.vw_os_action_priority_board
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id)
    AND priority_band = 'immediate';

  SELECT count(*) INTO v_active_missing
  FROM public.vw_os_missing_from_care_board
  WHERE status IN ('open','located');

  SELECT count(*) INTO v_reg40_overdue
  FROM public.vw_os_reg40_board
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id)
    AND board_state = 'overdue';

  SELECT count(*) INTO v_high_patterns
  FROM public.os_safeguarding_patterns
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id)
    AND escalation_status IN ('new','reviewing')
    AND severity IN ('high','critical');

  SELECT count(*) INTO v_critical_risk
  FROM public.vw_os_risk_heatmap
  WHERE overall_risk_level = 'critical';

  SELECT count(*) INTO v_low_resilience
  FROM public.vw_os_home_resilience_board
  WHERE resilience_state IN ('critical','high');

  SELECT count(*) INTO v_inspection_urgent
  FROM public.vw_os_inspection_readiness
  WHERE readiness_state IN ('urgent','requires_attention');

  SELECT round(avg(overall_quality_score), 2) INTO v_avg_quality
  FROM public.vw_os_kpi_latest
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id);

  SELECT round(avg(resilience_score), 2) INTO v_avg_resilience
  FROM public.vw_os_home_resilience_board
  WHERE (p_provider_id IS NULL OR provider_id = p_provider_id);

  INSERT INTO public.os_provider_command_snapshots (
    provider_id,
    total_homes,
    urgent_homes,
    critical_commands,
    immediate_actions,
    active_missing_episodes,
    overdue_reg40_count,
    high_risk_patterns,
    critical_risk_snapshots,
    low_resilience_homes,
    inspection_urgent_homes,
    average_quality_score,
    average_resilience_score,
    command_summary,
    safeguarding_summary,
    inspection_summary,
    workforce_summary,
    leadership_recommendations,
    created_by
  ) VALUES (
    p_provider_id,
    v_total_homes,
    v_urgent_homes,
    v_critical_commands,
    v_immediate_actions,
    v_active_missing,
    v_reg40_overdue,
    v_high_patterns,
    v_critical_risk,
    v_low_resilience,
    v_inspection_urgent,
    v_avg_quality,
    v_avg_resilience,
    jsonb_build_object(
      'critical_commands', v_critical_commands,
      'immediate_actions', v_immediate_actions,
      'urgent_homes', v_urgent_homes
    ),
    jsonb_build_object(
      'active_missing_episodes', v_active_missing,
      'overdue_reg40_count', v_reg40_overdue,
      'high_risk_patterns', v_high_patterns,
      'critical_risk_snapshots', v_critical_risk
    ),
    jsonb_build_object(
      'inspection_urgent_homes', v_inspection_urgent,
      'average_quality_score', v_avg_quality
    ),
    jsonb_build_object(
      'low_resilience_homes', v_low_resilience,
      'average_resilience_score', v_avg_resilience
    ),
    jsonb_build_array(
      CASE WHEN v_critical_commands > 0 THEN 'Review critical command items across homes immediately' ELSE NULL END,
      CASE WHEN v_active_missing > 0 THEN 'Review active missing-from-care episodes and leadership oversight' ELSE NULL END,
      CASE WHEN v_reg40_overdue > 0 THEN 'Escalate overdue Regulation 40 notifications' ELSE NULL END,
      CASE WHEN v_low_resilience > 0 THEN 'Review staffing resilience and workforce safeguarding pressure' ELSE NULL END,
      CASE WHEN v_inspection_urgent > 0 THEN 'Review inspection readiness action plans for urgent homes' ELSE NULL END
    ),
    p_created_by
  ) RETURNING id INTO v_id;

  PERFORM public.os_live_emit(
    'command.updated',
    'os_provider_command_snapshots',
    v_id::text,
    'Provider command snapshot generated',
    p_provider_id,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('critical_commands', v_critical_commands, 'immediate_actions', v_immediate_actions),
    ARRAY['responsible_individual','manager'],
    p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_provider_command_centre AS
SELECT DISTINCT ON (provider_id)
  id,
  provider_id,
  snapshot_at,
  total_homes,
  urgent_homes,
  critical_commands,
  immediate_actions,
  active_missing_episodes,
  overdue_reg40_count,
  high_risk_patterns,
  critical_risk_snapshots,
  low_resilience_homes,
  inspection_urgent_homes,
  average_quality_score,
  average_resilience_score,
  command_summary,
  safeguarding_summary,
  inspection_summary,
  workforce_summary,
  leadership_recommendations,
  created_at,
  CASE
    WHEN critical_commands > 0 OR active_missing_episodes > 0 OR overdue_reg40_count > 0 THEN 'critical'
    WHEN immediate_actions > 0 OR urgent_homes > 0 OR inspection_urgent_homes > 0 THEN 'high'
    WHEN high_risk_patterns > 0 OR low_resilience_homes > 0 THEN 'monitor'
    ELSE 'stable'
  END AS provider_state
FROM public.os_provider_command_snapshots
ORDER BY provider_id, created_at DESC;

CREATE OR REPLACE VIEW public.vw_os_provider_home_command_matrix AS
SELECT
  o.provider_id,
  o.home_id,
  o.open_commands,
  o.critical_commands,
  o.overdue_commands,
  o.safeguarding_pressure,
  o.quality_pressure,
  o.oversight_state,
  r.readiness_state,
  coalesce(hr.resilience_state, 'unknown') AS resilience_state,
  coalesce(rh.overall_risk_level, 'unknown') AS risk_level,
  coalesce(ap.immediate_count, 0) AS immediate_actions,
  coalesce(ap.today_count, 0) AS today_actions,
  coalesce(k.overall_quality_score, 0) AS quality_score,
  CASE
    WHEN o.oversight_state = 'critical' OR r.readiness_state = 'urgent' OR rh.overall_risk_level = 'critical' THEN 'critical'
    WHEN o.oversight_state = 'high' OR r.readiness_state = 'requires_attention' OR coalesce(ap.immediate_count, 0) > 0 THEN 'high'
    WHEN coalesce(hr.resilience_state, 'stable') IN ('critical','high') THEN 'workforce_pressure'
    ELSE 'monitor'
  END AS matrix_state
FROM public.vw_os_provider_oversight o
LEFT JOIN public.vw_os_inspection_readiness r ON r.home_id = o.home_id
LEFT JOIN public.vw_os_home_resilience_board hr ON hr.home_id = o.home_id
LEFT JOIN public.vw_os_risk_heatmap rh ON rh.home_id = o.home_id AND rh.young_person_id IS NULL
LEFT JOIN public.vw_os_action_priority_summary ap ON ap.home_id = o.home_id
LEFT JOIN public.vw_os_kpi_latest k ON k.home_id = o.home_id AND k.period = 'weekly';
