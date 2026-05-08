-- IndiCare OS predictive safeguarding analytics and heatmaps
-- Adds operational risk scoring, safeguarding indicators and cross-home intelligence.

DO $$ BEGIN
  CREATE TYPE os_risk_level AS ENUM ('low','moderate','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_risk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  overall_risk_level os_risk_level NOT NULL,
  overall_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  safeguarding_score numeric(6,2) NOT NULL DEFAULT 0,
  missing_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  medication_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  workforce_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  compliance_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  inspection_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_risk_snapshots_home_created
  ON public.os_risk_snapshots(home_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_risk_snapshots_level
  ON public.os_risk_snapshots(overall_risk_level, calculated_at DESC);

CREATE OR REPLACE FUNCTION public.os_generate_risk_snapshot(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4 DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_missing_count int4 := 0;
  v_reg40_overdue int4 := 0;
  v_critical_commands int4 := 0;
  v_overdue_commands int4 := 0;
  v_medication_escalations int4 := 0;
  v_workforce_issues int4 := 0;
  v_safeguarding numeric := 0;
  v_missing numeric := 0;
  v_medication numeric := 0;
  v_workforce numeric := 0;
  v_compliance numeric := 0;
  v_inspection numeric := 0;
  v_overall numeric := 0;
  v_level os_risk_level;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_missing_count
  FROM public.os_missing_from_care_workflows
  WHERE home_id = p_home_id
    AND status IN ('open','located');

  SELECT count(*) INTO v_reg40_overdue
  FROM public.vw_os_reg40_board
  WHERE home_id = p_home_id
    AND board_state = 'overdue';

  SELECT count(*) INTO v_critical_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND status IN ('open','in_progress','waiting')
    AND priority = 'critical';

  SELECT count(*) INTO v_overdue_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND status IN ('open','in_progress','waiting')
    AND due_at < now();

  SELECT count(*) INTO v_medication_escalations
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND domain = 'medication'
    AND priority IN ('high','critical')
    AND created_at > now() - interval '30 days';

  SELECT count(*) INTO v_workforce_issues
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND domain = 'workforce'
    AND status IN ('open','in_progress','waiting');

  v_safeguarding := (v_critical_commands * 15) + (v_overdue_commands * 5);
  v_missing := (v_missing_count * 20);
  v_medication := (v_medication_escalations * 12);
  v_workforce := (v_workforce_issues * 8);
  v_compliance := (v_reg40_overdue * 15);
  v_inspection := (v_overdue_commands * 4) + (v_reg40_overdue * 10);

  v_overall := v_safeguarding + v_missing + v_medication + v_workforce + v_compliance + v_inspection;

  v_level := CASE
    WHEN v_overall >= 120 THEN 'critical'
    WHEN v_overall >= 70 THEN 'high'
    WHEN v_overall >= 30 THEN 'moderate'
    ELSE 'low'
  END;

  INSERT INTO public.os_risk_snapshots (
    provider_id,
    home_id,
    young_person_id,
    overall_risk_level,
    overall_risk_score,
    safeguarding_score,
    missing_risk_score,
    medication_risk_score,
    workforce_risk_score,
    compliance_risk_score,
    inspection_risk_score,
    risk_factors,
    recommended_actions,
    ai_summary,
    created_by
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_young_person_id,
    v_level,
    v_overall,
    v_safeguarding,
    v_missing,
    v_medication,
    v_workforce,
    v_compliance,
    v_inspection,
    jsonb_build_array(
      jsonb_build_object('factor','missing_episodes','count',v_missing_count),
      jsonb_build_object('factor','critical_commands','count',v_critical_commands),
      jsonb_build_object('factor','overdue_commands','count',v_overdue_commands),
      jsonb_build_object('factor','reg40_overdue','count',v_reg40_overdue)
    ),
    jsonb_build_array(
      'Review safeguarding actions requiring escalation',
      'Prioritise overdue operational tasks',
      'Review handover and staffing risks',
      'Audit missing-from-care follow-up compliance'
    ),
    concat(
      'Operational risk profile generated. Overall level: ', v_level,
      '. Missing episodes: ', v_missing_count,
      '. Critical commands: ', v_critical_commands,
      '. Overdue commands: ', v_overdue_commands,
      '. Regulation 40 overdue: ', v_reg40_overdue, '.'
    ),
    p_created_by
  ) RETURNING id INTO v_id;

  PERFORM public.os_live_emit(
    'ai.recommendation.created',
    'os_risk_snapshots',
    v_id::text,
    'Predictive safeguarding risk snapshot generated',
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    jsonb_build_object('risk_level', v_level, 'risk_score', v_overall),
    ARRAY['manager','responsible_individual'],
    p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_risk_heatmap AS
SELECT
  r.home_id,
  r.young_person_id,
  r.overall_risk_level::text AS overall_risk_level,
  r.overall_risk_score,
  r.safeguarding_score,
  r.missing_risk_score,
  r.medication_risk_score,
  r.workforce_risk_score,
  r.compliance_risk_score,
  r.inspection_risk_score,
  r.ai_summary,
  r.calculated_at,
  CASE
    WHEN r.overall_risk_level = 'critical' THEN '#dc2626'
    WHEN r.overall_risk_level = 'high' THEN '#ea580c'
    WHEN r.overall_risk_level = 'moderate' THEN '#ca8a04'
    ELSE '#16a34a'
  END AS heatmap_colour
FROM public.os_risk_snapshots r
WHERE r.calculated_at = (
  SELECT max(r2.calculated_at)
  FROM public.os_risk_snapshots r2
  WHERE r2.home_id = r.home_id
    AND coalesce(r2.young_person_id, -1) = coalesce(r.young_person_id, -1)
);

CREATE OR REPLACE VIEW public.vw_os_cross_home_trends AS
SELECT
  provider_id,
  date_trunc('week', calculated_at) AS reporting_week,
  count(*) FILTER (WHERE overall_risk_level='critical') AS critical_risk_homes,
  count(*) FILTER (WHERE overall_risk_level='high') AS high_risk_homes,
  avg(overall_risk_score) AS avg_risk_score,
  avg(safeguarding_score) AS avg_safeguarding_score,
  avg(missing_risk_score) AS avg_missing_risk_score,
  avg(compliance_risk_score) AS avg_compliance_risk_score,
  avg(inspection_risk_score) AS avg_inspection_risk_score
FROM public.os_risk_snapshots
GROUP BY provider_id, date_trunc('week', calculated_at)
ORDER BY reporting_week DESC;
