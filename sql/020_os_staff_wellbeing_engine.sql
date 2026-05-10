-- IndiCare OS staff wellbeing and burnout intelligence engine
-- Adds safer-staffing resilience analytics, burnout risk scoring and workforce pressure intelligence.

DO $$ BEGIN
  CREATE TYPE os_wellbeing_risk_level AS ENUM ('low','moderate','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_staff_wellbeing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  staff_id int4 NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  wellbeing_score numeric(6,2) NOT NULL DEFAULT 100,
  burnout_risk_score numeric(6,2) NOT NULL DEFAULT 0,
  risk_level os_wellbeing_risk_level NOT NULL DEFAULT 'low',
  overtime_hours numeric(8,2) NOT NULL DEFAULT 0,
  sleep_in_count int4 NOT NULL DEFAULT 0,
  safeguarding_command_count int4 NOT NULL DEFAULT 0,
  critical_command_count int4 NOT NULL DEFAULT 0,
  incident_exposure_count int4 NOT NULL DEFAULT 0,
  missing_episode_exposure_count int4 NOT NULL DEFAULT 0,
  medication_escalation_count int4 NOT NULL DEFAULT 0,
  shift_task_count int4 NOT NULL DEFAULT 0,
  completed_shift_task_count int4 NOT NULL DEFAULT 0,
  rota_instability_score numeric(6,2) NOT NULL DEFAULT 0,
  emotional_load_score numeric(6,2) NOT NULL DEFAULT 0,
  leadership_concern boolean NOT NULL DEFAULT false,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, staff_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.os_home_resilience_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  resilience_score numeric(6,2) NOT NULL DEFAULT 100,
  staffing_pressure_score numeric(6,2) NOT NULL DEFAULT 0,
  safeguarding_workforce_pressure numeric(6,2) NOT NULL DEFAULT 0,
  high_risk_staff_count int4 NOT NULL DEFAULT 0,
  critical_risk_staff_count int4 NOT NULL DEFAULT 0,
  open_workforce_commands int4 NOT NULL DEFAULT 0,
  rota_pressure_count int4 NOT NULL DEFAULT 0,
  leadership_summary text,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_os_staff_wellbeing_home_risk
  ON public.os_staff_wellbeing_snapshots(home_id, risk_level, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_os_staff_wellbeing_staff_period
  ON public.os_staff_wellbeing_snapshots(staff_id, period_start DESC, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_os_home_resilience_home_period
  ON public.os_home_resilience_snapshots(home_id, period_end DESC);

CREATE OR REPLACE FUNCTION public.os_generate_staff_wellbeing_snapshot(
  p_provider_id int4,
  p_home_id int4,
  p_staff_id int4,
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
  v_safeguarding_commands int4 := 0;
  v_critical_commands int4 := 0;
  v_missing_exposure int4 := 0;
  v_medication_escalations int4 := 0;
  v_shift_tasks int4 := 0;
  v_completed_shift_tasks int4 := 0;
  v_overtime numeric := 0;
  v_sleep_ins int4 := 0;
  v_rota_instability numeric := 0;
  v_emotional_load numeric := 0;
  v_burnout numeric := 0;
  v_wellbeing numeric := 100;
  v_level os_wellbeing_risk_level;
  v_leadership_concern boolean := false;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_safeguarding_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND assigned_to_staff_id = p_staff_id
    AND domain IN ('safeguarding','missing_from_care','reg40','risk')
    AND created_at::date BETWEEN v_start AND v_end;

  SELECT count(*) INTO v_critical_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND assigned_to_staff_id = p_staff_id
    AND priority = 'critical'
    AND created_at::date BETWEEN v_start AND v_end;

  SELECT count(*) INTO v_missing_exposure
  FROM public.os_shift_tasks
  WHERE home_id = p_home_id
    AND assigned_to_staff_id = p_staff_id
    AND title ILIKE '%missing%'
    AND created_at::date BETWEEN v_start AND v_end;

  SELECT count(*) INTO v_medication_escalations
  FROM public.os_shift_tasks
  WHERE home_id = p_home_id
    AND assigned_to_staff_id = p_staff_id
    AND title ILIKE '%medication%'
    AND created_at::date BETWEEN v_start AND v_end;

  SELECT count(*), count(*) FILTER (WHERE status = 'completed')
  INTO v_shift_tasks, v_completed_shift_tasks
  FROM public.os_shift_tasks
  WHERE home_id = p_home_id
    AND assigned_to_staff_id = p_staff_id
    AND created_at::date BETWEEN v_start AND v_end;

  -- Optional rota/overtime data can be connected later. Until then, operational exposure is the primary signal.
  v_overtime := greatest(0, v_shift_tasks - 15) * 1.5;
  v_sleep_ins := 0;
  v_rota_instability := least(100, greatest(0, (v_shift_tasks - v_completed_shift_tasks) * 4));
  v_emotional_load := least(100, (v_safeguarding_commands * 8) + (v_critical_commands * 15) + (v_missing_exposure * 10));

  v_burnout := least(100,
    (v_overtime * 1.5)
    + (v_sleep_ins * 6)
    + (v_safeguarding_commands * 7)
    + (v_critical_commands * 12)
    + (v_missing_exposure * 8)
    + (v_medication_escalations * 5)
    + (v_rota_instability * 0.5)
  );

  v_wellbeing := greatest(0, 100 - v_burnout);

  v_level := CASE
    WHEN v_burnout >= 80 THEN 'critical'
    WHEN v_burnout >= 55 THEN 'high'
    WHEN v_burnout >= 30 THEN 'moderate'
    ELSE 'low'
  END;

  v_leadership_concern := v_level IN ('high','critical');

  INSERT INTO public.os_staff_wellbeing_snapshots (
    provider_id, home_id, staff_id, period_start, period_end,
    wellbeing_score, burnout_risk_score, risk_level, overtime_hours, sleep_in_count,
    safeguarding_command_count, critical_command_count, incident_exposure_count,
    missing_episode_exposure_count, medication_escalation_count, shift_task_count,
    completed_shift_task_count, rota_instability_score, emotional_load_score,
    leadership_concern, recommendations, risk_factors, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_staff_id, v_start, v_end,
    v_wellbeing, v_burnout, v_level, v_overtime, v_sleep_ins,
    v_safeguarding_commands, v_critical_commands, v_safeguarding_commands,
    v_missing_exposure, v_medication_escalations, v_shift_tasks,
    v_completed_shift_tasks, v_rota_instability, v_emotional_load,
    v_leadership_concern,
    jsonb_build_array(
      'Review staff wellbeing and supervision needs',
      'Consider rota adjustments if operational exposure remains high',
      'Review safeguarding debrief and reflective supervision needs',
      'Monitor workload distribution across the team'
    ),
    jsonb_build_array(
      jsonb_build_object('factor','safeguarding_commands','count',v_safeguarding_commands),
      jsonb_build_object('factor','critical_commands','count',v_critical_commands),
      jsonb_build_object('factor','missing_exposure','count',v_missing_exposure),
      jsonb_build_object('factor','shift_tasks','count',v_shift_tasks),
      jsonb_build_object('factor','rota_instability_score','score',v_rota_instability)
    ),
    p_created_by
  )
  ON CONFLICT (home_id, staff_id, period_start, period_end) DO UPDATE SET
    wellbeing_score = EXCLUDED.wellbeing_score,
    burnout_risk_score = EXCLUDED.burnout_risk_score,
    risk_level = EXCLUDED.risk_level,
    overtime_hours = EXCLUDED.overtime_hours,
    sleep_in_count = EXCLUDED.sleep_in_count,
    safeguarding_command_count = EXCLUDED.safeguarding_command_count,
    critical_command_count = EXCLUDED.critical_command_count,
    missing_episode_exposure_count = EXCLUDED.missing_episode_exposure_count,
    medication_escalation_count = EXCLUDED.medication_escalation_count,
    shift_task_count = EXCLUDED.shift_task_count,
    completed_shift_task_count = EXCLUDED.completed_shift_task_count,
    rota_instability_score = EXCLUDED.rota_instability_score,
    emotional_load_score = EXCLUDED.emotional_load_score,
    leadership_concern = EXCLUDED.leadership_concern,
    recommendations = EXCLUDED.recommendations,
    risk_factors = EXCLUDED.risk_factors,
    created_at = now()
  RETURNING id INTO v_id;

  IF v_leadership_concern THEN
    PERFORM public.os_command_create_manual_item(
      'staff_training_expiry',
      p_provider_id,
      p_home_id,
      NULL,
      p_staff_id,
      'Staff wellbeing risk has reached ' || v_level::text || ' level. Review supervision, rota pressure and safeguarding exposure.',
      'os_staff_wellbeing_snapshots',
      NULL,
      now() + interval '72 hours',
      p_created_by,
      jsonb_build_object('wellbeing_snapshot_id', v_id, 'burnout_risk_score', v_burnout)
    );
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_generate_home_resilience_snapshot(
  p_provider_id int4,
  p_home_id int4,
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
  v_high int4 := 0;
  v_critical int4 := 0;
  v_workforce_commands int4 := 0;
  v_rota_pressure int4 := 0;
  v_avg_burnout numeric := 0;
  v_staffing_pressure numeric := 0;
  v_safeguarding_pressure numeric := 0;
  v_resilience numeric := 100;
  v_id uuid;
BEGIN
  SELECT
    count(*) FILTER (WHERE risk_level = 'high'),
    count(*) FILTER (WHERE risk_level = 'critical'),
    coalesce(avg(burnout_risk_score), 0),
    coalesce(sum(rota_instability_score), 0)
  INTO v_high, v_critical, v_avg_burnout, v_rota_pressure
  FROM public.os_staff_wellbeing_snapshots
  WHERE home_id = p_home_id
    AND period_start = v_start
    AND period_end = v_end;

  SELECT count(*) INTO v_workforce_commands
  FROM public.os_command_items
  WHERE home_id = p_home_id
    AND domain IN ('workforce','rota')
    AND status IN ('open','in_progress','waiting');

  SELECT coalesce(avg(safeguarding_score), 0) INTO v_safeguarding_pressure
  FROM public.os_risk_snapshots
  WHERE home_id = p_home_id
    AND calculated_at::date BETWEEN v_start AND v_end;

  v_staffing_pressure := least(100, (v_high * 20) + (v_critical * 35) + (v_workforce_commands * 8) + (v_rota_pressure * 0.2));
  v_resilience := greatest(0, 100 - ((v_staffing_pressure * 0.55) + (v_safeguarding_pressure * 0.25) + (v_avg_burnout * 0.20)));

  INSERT INTO public.os_home_resilience_snapshots (
    provider_id, home_id, period_start, period_end, resilience_score,
    staffing_pressure_score, safeguarding_workforce_pressure, high_risk_staff_count,
    critical_risk_staff_count, open_workforce_commands, rota_pressure_count,
    leadership_summary, recommendations, created_by
  ) VALUES (
    p_provider_id, p_home_id, v_start, v_end, v_resilience,
    v_staffing_pressure, v_safeguarding_pressure, v_high,
    v_critical, v_workforce_commands, v_rota_pressure::int4,
    concat('Home resilience score ', round(v_resilience, 2), '. High risk staff: ', v_high, '. Critical risk staff: ', v_critical, '. Workforce command pressure: ', v_workforce_commands, '.'),
    jsonb_build_array(
      'Review staff supervision and wellbeing support',
      'Review rota sustainability and safeguarding workload distribution',
      'Consider additional management oversight where resilience is low',
      'Review safer staffing and agency dependency if applicable'
    ),
    p_created_by
  )
  ON CONFLICT (home_id, period_start, period_end) DO UPDATE SET
    resilience_score = EXCLUDED.resilience_score,
    staffing_pressure_score = EXCLUDED.staffing_pressure_score,
    safeguarding_workforce_pressure = EXCLUDED.safeguarding_workforce_pressure,
    high_risk_staff_count = EXCLUDED.high_risk_staff_count,
    critical_risk_staff_count = EXCLUDED.critical_risk_staff_count,
    open_workforce_commands = EXCLUDED.open_workforce_commands,
    rota_pressure_count = EXCLUDED.rota_pressure_count,
    leadership_summary = EXCLUDED.leadership_summary,
    recommendations = EXCLUDED.recommendations,
    created_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_staff_wellbeing_board AS
SELECT DISTINCT ON (staff_id, home_id)
  id,
  provider_id,
  home_id,
  staff_id,
  period_start,
  period_end,
  wellbeing_score,
  burnout_risk_score,
  risk_level::text AS risk_level,
  overtime_hours,
  sleep_in_count,
  safeguarding_command_count,
  critical_command_count,
  incident_exposure_count,
  missing_episode_exposure_count,
  medication_escalation_count,
  shift_task_count,
  completed_shift_task_count,
  rota_instability_score,
  emotional_load_score,
  leadership_concern,
  recommendations,
  risk_factors,
  created_at,
  CASE
    WHEN risk_level = 'critical' THEN 0
    WHEN risk_level = 'high' THEN 1
    WHEN risk_level = 'moderate' THEN 2
    ELSE 3
  END AS risk_sort
FROM public.os_staff_wellbeing_snapshots
ORDER BY staff_id, home_id, period_end DESC, created_at DESC;

CREATE OR REPLACE VIEW public.vw_os_home_resilience_board AS
SELECT DISTINCT ON (home_id)
  id,
  provider_id,
  home_id,
  period_start,
  period_end,
  resilience_score,
  staffing_pressure_score,
  safeguarding_workforce_pressure,
  high_risk_staff_count,
  critical_risk_staff_count,
  open_workforce_commands,
  rota_pressure_count,
  leadership_summary,
  recommendations,
  created_at,
  CASE
    WHEN resilience_score < 40 THEN 'critical'
    WHEN resilience_score < 60 THEN 'high'
    WHEN resilience_score < 75 THEN 'moderate'
    ELSE 'stable'
  END AS resilience_state
FROM public.os_home_resilience_snapshots
ORDER BY home_id, period_end DESC, created_at DESC;
