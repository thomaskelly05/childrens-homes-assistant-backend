-- IndiCare OS predictive placement stability engine
-- Forecasts placement fragility, disruption risk and intervention urgency.

DO $$ BEGIN
  CREATE TYPE os_placement_risk_level AS ENUM ('stable','watch','fragile','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_placement_stability_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  stability_score numeric(6,2) NOT NULL DEFAULT 100,
  disruption_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  risk_level os_placement_risk_level NOT NULL DEFAULT 'stable',
  safeguarding_escalation_score numeric(6,2) NOT NULL DEFAULT 0,
  missing_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  emotional_distress_score numeric(6,2) NOT NULL DEFAULT 0,
  placement_strain_score numeric(6,2) NOT NULL DEFAULT 0,
  contextual_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  workforce_instability_score numeric(6,2) NOT NULL DEFAULT 0,
  protective_relationship_score numeric(6,2) NOT NULL DEFAULT 0,
  predicted_disruption_risk boolean NOT NULL DEFAULT false,
  intervention_urgency text NOT NULL DEFAULT 'monitor' CHECK (intervention_urgency IN ('immediate','today','this_week','monitor')),
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  protective_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_placement_stability_home_risk
  ON public.os_placement_stability_snapshots(home_id, risk_level, disruption_risk_score DESC, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_placement_stability_yp
  ON public.os_placement_stability_snapshots(young_person_id, calculated_at DESC);

CREATE OR REPLACE FUNCTION public.os_generate_placement_stability_snapshot(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_missing_14 int4 := 0;
  v_missing_30 int4 := 0;
  v_patterns int4 := 0;
  v_high_patterns int4 := 0;
  v_contextual int4 := 0;
  v_strategy int4 := 0;
  v_commands int4 := 0;
  v_critical_commands int4 := 0;
  v_overlays int4 := 0;
  v_reviews int4 := 0;
  v_workforce_pressure numeric := 0;
  v_safeguarding numeric := 0;
  v_missing_score numeric := 0;
  v_emotional numeric := 0;
  v_strain numeric := 0;
  v_contextual_score numeric := 0;
  v_disruption numeric := 0;
  v_stability numeric := 100;
  v_protective numeric := 20;
  v_level os_placement_risk_level;
  v_urgency text;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_missing_14
  FROM public.os_missing_from_care_workflows
  WHERE home_id = p_home_id
    AND young_person_id = p_young_person_id
    AND missing_from > now() - interval '14 days';

  SELECT count(*) INTO v_missing_30
  FROM public.os_missing_from_care_workflows
  WHERE home_id = p_home_id
    AND young_person_id = p_young_person_id
    AND missing_from > now() - interval '30 days';

  SELECT count(*), count(*) FILTER (WHERE severity IN ('high','critical'))
  INTO v_patterns, v_high_patterns
  FROM public.os_safeguarding_patterns
  WHERE home_id = p_home_id
    AND young_person_id = p_young_person_id
    AND escalation_status IN ('new','reviewing');

  SELECT count(*), count(*) FILTER (WHERE requires_strategy_discussion = true)
  INTO v_contextual, v_strategy
  FROM public.os_contextual_risk_indicators
  WHERE home_id = p_home_id
    AND young_person_id = p_young_person_id
    AND identified_at > now() - interval '90 days';

  SELECT count(*), count(*) FILTER (WHERE priority = 'critical')
  INTO v_commands, v_critical_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND young_person_id = p_young_person_id
    AND status IN ('open','in_progress','waiting');

  SELECT count(*) INTO v_overlays
  FROM public.vw_os_chronology_intelligence
  WHERE home_id = p_home_id
    AND young_person_id = p_young_person_id
    AND overlay_count > 0
    AND event_at > now() - interval '30 days';

  SELECT count(*) INTO v_reviews
  FROM public.os_manager_reviews
  WHERE home_id = p_home_id
    AND young_person_id = p_young_person_id
    AND status = 'approved'
    AND created_at > now() - interval '30 days';

  SELECT coalesce(avg(staffing_pressure_score), 0) INTO v_workforce_pressure
  FROM public.vw_os_home_resilience_board
  WHERE home_id = p_home_id;

  v_safeguarding := least(100, (v_patterns * 12) + (v_high_patterns * 20) + (v_critical_commands * 18));
  v_missing_score := least(100, (v_missing_14 * 18) + (v_missing_30 * 8));
  v_contextual_score := least(100, (v_contextual * 10) + (v_strategy * 25));
  v_emotional := least(100, (v_overlays * 4) + (v_commands * 3));
  v_strain := least(100, (v_commands * 5) + (v_critical_commands * 15) + (v_workforce_pressure * 0.25));
  v_protective := least(100, 20 + (v_reviews * 10));

  v_disruption := least(100,
    (v_safeguarding * 0.28)
    + (v_missing_score * 0.24)
    + (v_contextual_score * 0.18)
    + (v_emotional * 0.12)
    + (v_strain * 0.13)
    + (v_workforce_pressure * 0.05)
    - (v_protective * 0.10)
  );

  v_stability := greatest(0, 100 - v_disruption);

  v_level := CASE
    WHEN v_disruption >= 80 THEN 'critical'
    WHEN v_disruption >= 55 THEN 'fragile'
    WHEN v_disruption >= 30 THEN 'watch'
    ELSE 'stable'
  END;

  v_urgency := CASE
    WHEN v_disruption >= 80 THEN 'immediate'
    WHEN v_disruption >= 55 THEN 'today'
    WHEN v_disruption >= 30 THEN 'this_week'
    ELSE 'monitor'
  END;

  INSERT INTO public.os_placement_stability_snapshots (
    provider_id,
    home_id,
    young_person_id,
    stability_score,
    disruption_risk_score,
    risk_level,
    safeguarding_escalation_score,
    missing_risk_score,
    emotional_distress_score,
    placement_strain_score,
    contextual_risk_score,
    workforce_instability_score,
    protective_relationship_score,
    predicted_disruption_risk,
    intervention_urgency,
    risk_factors,
    protective_factors,
    recommendations,
    created_by
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_young_person_id,
    v_stability,
    v_disruption,
    v_level,
    v_safeguarding,
    v_missing_score,
    v_emotional,
    v_strain,
    v_contextual_score,
    v_workforce_pressure,
    v_protective,
    v_disruption >= 55,
    v_urgency,
    jsonb_build_array(
      jsonb_build_object('factor','missing_episodes_14_days','count',v_missing_14),
      jsonb_build_object('factor','active_safeguarding_patterns','count',v_patterns),
      jsonb_build_object('factor','high_risk_patterns','count',v_high_patterns),
      jsonb_build_object('factor','contextual_risk_indicators','count',v_contextual),
      jsonb_build_object('factor','open_commands','count',v_commands),
      jsonb_build_object('factor','workforce_pressure','score',v_workforce_pressure)
    ),
    jsonb_build_array(
      jsonb_build_object('factor','recent_manager_reviews','count',v_reviews),
      jsonb_build_object('factor','protective_relationship_score','score',v_protective)
    ),
    jsonb_build_array(
      CASE WHEN v_missing_14 > 0 THEN 'Review missing-from-care plan and return-home interview themes' ELSE NULL END,
      CASE WHEN v_high_patterns > 0 THEN 'Review safeguarding pattern trajectory and intervention plan' ELSE NULL END,
      CASE WHEN v_contextual > 0 THEN 'Review contextual safeguarding indicators and external risk links' ELSE NULL END,
      CASE WHEN v_workforce_pressure > 50 THEN 'Review staffing consistency and relationship stability' ELSE NULL END,
      'Consider placement stability meeting if risk remains elevated',
      'Record child impact and management evaluation'
    ),
    p_created_by
  ) RETURNING id INTO v_id;

  IF v_disruption >= 55 THEN
    PERFORM public.os_command_create_manual_item(
      'risk_review_due',
      p_provider_id,
      p_home_id,
      p_young_person_id,
      NULL,
      'Placement stability risk is elevated. Review escalation trajectory, safeguarding plan, contextual risks and staffing consistency.',
      'os_placement_stability_snapshots',
      NULL,
      now() + interval '48 hours',
      p_created_by,
      jsonb_build_object('placement_stability_snapshot_id', v_id, 'disruption_risk_score', v_disruption)
    );
  END IF;

  PERFORM public.os_live_emit(
    'ai.recommendation.created',
    'os_placement_stability_snapshots',
    v_id::text,
    'Placement stability snapshot generated',
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    jsonb_build_object('risk_level', v_level, 'disruption_risk_score', v_disruption),
    ARRAY['senior','manager','responsible_individual'],
    p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_placement_stability_board AS
SELECT DISTINCT ON (young_person_id)
  id,
  provider_id,
  home_id,
  young_person_id,
  calculated_at,
  stability_score,
  disruption_risk_score,
  risk_level::text AS risk_level,
  safeguarding_escalation_score,
  missing_risk_score,
  emotional_distress_score,
  placement_strain_score,
  contextual_risk_score,
  workforce_instability_score,
  protective_relationship_score,
  predicted_disruption_risk,
  intervention_urgency,
  risk_factors,
  protective_factors,
  recommendations,
  created_at,
  CASE risk_level
    WHEN 'critical' THEN 0
    WHEN 'fragile' THEN 1
    WHEN 'watch' THEN 2
    ELSE 3
  END AS risk_sort
FROM public.os_placement_stability_snapshots
ORDER BY young_person_id, calculated_at DESC;

CREATE OR REPLACE VIEW public.vw_os_home_placement_stability_summary AS
SELECT
  provider_id,
  home_id,
  count(*) FILTER (WHERE risk_level='critical') AS critical_placements,
  count(*) FILTER (WHERE risk_level='fragile') AS fragile_placements,
  count(*) FILTER (WHERE risk_level='watch') AS watch_placements,
  round(avg(stability_score), 2) AS avg_stability_score,
  round(avg(disruption_risk_score), 2) AS avg_disruption_risk_score,
  max(calculated_at) AS latest_calculated_at
FROM public.vw_os_placement_stability_board
GROUP BY provider_id, home_id;
