-- IndiCare OS operational KPI engine
-- Adds KPI snapshots for safeguarding response, recording quality, workforce compliance and inspection readiness.

DO $$ BEGIN
  CREATE TYPE os_kpi_period AS ENUM ('daily','weekly','monthly','quarterly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  period os_kpi_period NOT NULL DEFAULT 'weekly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  safeguarding_response_score numeric(6,2) NOT NULL DEFAULT 0,
  recording_quality_score numeric(6,2) NOT NULL DEFAULT 0,
  workforce_compliance_score numeric(6,2) NOT NULL DEFAULT 0,
  inspection_readiness_score numeric(6,2) NOT NULL DEFAULT 0,
  leadership_oversight_score numeric(6,2) NOT NULL DEFAULT 0,
  overall_quality_score numeric(6,2) NOT NULL DEFAULT 0,
  measures jsonb NOT NULL DEFAULT '{}'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, period, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_os_kpi_snapshots_home_period ON public.os_kpi_snapshots(home_id, period, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_os_kpi_snapshots_provider_period ON public.os_kpi_snapshots(provider_id, period, period_start DESC);

CREATE OR REPLACE FUNCTION public.os_score_inverse_count(p_count int4, p_weight numeric DEFAULT 10, p_floor numeric DEFAULT 0)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT greatest(p_floor, 100 - (coalesce(p_count, 0) * p_weight));
$$;

CREATE OR REPLACE FUNCTION public.os_generate_kpi_snapshot(
  p_provider_id int4,
  p_home_id int4,
  p_period os_kpi_period DEFAULT 'weekly',
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_start date := coalesce(p_period_start, current_date - interval '7 days');
  v_end date := coalesce(p_period_end, current_date);
  v_incidents int4 := 0;
  v_missing int4 := 0;
  v_reg40_overdue int4 := 0;
  v_daily_gaps int4 := 0;
  v_medication_open int4 := 0;
  v_workforce_issues int4 := 0;
  v_open_commands int4 := 0;
  v_overdue_commands int4 := 0;
  v_evidence_gaps int4 := 0;
  v_safeguarding numeric;
  v_recording numeric;
  v_workforce numeric;
  v_inspection numeric;
  v_leadership numeric;
  v_overall numeric;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_incidents
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND domain = 'safeguarding'
    AND created_at::date BETWEEN v_start AND v_end;

  SELECT count(*) INTO v_missing
  FROM public.os_missing_from_care_workflows
  WHERE home_id = p_home_id
    AND created_at::date BETWEEN v_start AND v_end;

  SELECT count(*) INTO v_reg40_overdue
  FROM public.vw_os_reg40_board
  WHERE home_id = p_home_id
    AND board_state = 'overdue';

  SELECT count(*) INTO v_daily_gaps
  FROM public.os_daily_record_gaps
  WHERE home_id = p_home_id
    AND resolved = false
    AND shift_date BETWEEN v_start AND v_end;

  SELECT count(*) INTO v_medication_open
  FROM public.os_medication_escalations
  WHERE home_id = p_home_id
    AND status IN ('open','review_required');

  SELECT count(*) INTO v_workforce_issues
  FROM public.os_workforce_compliance
  WHERE home_id = p_home_id
    AND status IN ('warning','expired','missing');

  SELECT count(*) INTO v_open_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND status IN ('open','in_progress','waiting');

  SELECT count(*) INTO v_overdue_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND status IN ('open','in_progress','waiting')
    AND due_at < now();

  SELECT count(*) INTO v_evidence_gaps
  FROM public.os_inspection_evidence_notes
  WHERE home_id = p_home_id
    AND strength = 'gap';

  v_safeguarding := least(100, greatest(0, public.os_score_inverse_count(v_reg40_overdue, 20) - (v_missing * 5)));
  v_recording := public.os_score_inverse_count(v_daily_gaps, 8);
  v_workforce := public.os_score_inverse_count(v_workforce_issues, 10);
  v_inspection := greatest(0, public.os_score_inverse_count(v_evidence_gaps, 10) - (v_reg40_overdue * 10));
  v_leadership := greatest(0, public.os_score_inverse_count(v_overdue_commands, 6) - (v_open_commands * 1));

  v_overall := round(((v_safeguarding + v_recording + v_workforce + v_inspection + v_leadership) / 5), 2);

  INSERT INTO public.os_kpi_snapshots (
    provider_id, home_id, period, period_start, period_end,
    safeguarding_response_score, recording_quality_score, workforce_compliance_score,
    inspection_readiness_score, leadership_oversight_score, overall_quality_score,
    measures, risks, recommendations, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_period, v_start, v_end,
    v_safeguarding, v_recording, v_workforce, v_inspection, v_leadership, v_overall,
    jsonb_build_object(
      'incidents', v_incidents,
      'missing_episodes', v_missing,
      'reg40_overdue', v_reg40_overdue,
      'daily_record_gaps', v_daily_gaps,
      'medication_open', v_medication_open,
      'workforce_issues', v_workforce_issues,
      'open_commands', v_open_commands,
      'overdue_commands', v_overdue_commands,
      'evidence_gaps', v_evidence_gaps
    ),
    jsonb_build_array(
      CASE WHEN v_reg40_overdue > 0 THEN 'Regulation 40 overdue actions require immediate review' ELSE null END,
      CASE WHEN v_daily_gaps > 0 THEN 'Daily recording gaps may weaken inspection evidence' ELSE null END,
      CASE WHEN v_workforce_issues > 0 THEN 'Workforce compliance issues may affect safer staffing' ELSE null END,
      CASE WHEN v_overdue_commands > 0 THEN 'Overdue OS Command items indicate leadership follow-up pressure' ELSE null END
    ),
    jsonb_build_array(
      'Review overdue operational command items',
      'Audit daily record completeness',
      'Check workforce compliance matrix',
      'Update inspection evidence notes for any weak or gap areas'
    ),
    p_created_by
  )
  ON CONFLICT (home_id, period, period_start, period_end) DO UPDATE SET
    safeguarding_response_score = EXCLUDED.safeguarding_response_score,
    recording_quality_score = EXCLUDED.recording_quality_score,
    workforce_compliance_score = EXCLUDED.workforce_compliance_score,
    inspection_readiness_score = EXCLUDED.inspection_readiness_score,
    leadership_oversight_score = EXCLUDED.leadership_oversight_score,
    overall_quality_score = EXCLUDED.overall_quality_score,
    measures = EXCLUDED.measures,
    risks = EXCLUDED.risks,
    recommendations = EXCLUDED.recommendations,
    created_at = now()
  RETURNING id INTO v_id;

  PERFORM public.os_live_emit(
    'ai.recommendation.created',
    'os_kpi_snapshots',
    v_id::text,
    'Operational KPI snapshot generated',
    p_provider_id,
    p_home_id,
    NULL,
    NULL,
    jsonb_build_object('overall_quality_score', v_overall),
    ARRAY['manager','responsible_individual'],
    p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_kpi_latest AS
SELECT DISTINCT ON (home_id, period)
  id,
  provider_id,
  home_id,
  period::text AS period,
  period_start,
  period_end,
  safeguarding_response_score,
  recording_quality_score,
  workforce_compliance_score,
  inspection_readiness_score,
  leadership_oversight_score,
  overall_quality_score,
  measures,
  risks,
  recommendations,
  created_at
FROM public.os_kpi_snapshots
ORDER BY home_id, period, period_end DESC, created_at DESC;

CREATE OR REPLACE VIEW public.vw_os_provider_quality_scorecard AS
SELECT
  provider_id,
  period::text AS period,
  period_start,
  period_end,
  count(*) AS homes_reporting,
  round(avg(overall_quality_score), 2) AS avg_quality_score,
  round(avg(safeguarding_response_score), 2) AS avg_safeguarding_score,
  round(avg(recording_quality_score), 2) AS avg_recording_score,
  round(avg(workforce_compliance_score), 2) AS avg_workforce_score,
  round(avg(inspection_readiness_score), 2) AS avg_inspection_score,
  round(avg(leadership_oversight_score), 2) AS avg_leadership_score,
  count(*) FILTER (WHERE overall_quality_score < 60) AS homes_below_threshold,
  count(*) FILTER (WHERE safeguarding_response_score < 60) AS safeguarding_concern_homes
FROM public.os_kpi_snapshots
GROUP BY provider_id, period, period_start, period_end
ORDER BY period_end DESC;
