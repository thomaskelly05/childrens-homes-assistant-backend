-- IndiCare OS safeguarding pattern and escalation engine
-- Detects recurring safeguarding patterns, contextual risks and escalation triggers.

DO $$ BEGIN
  CREATE TYPE os_pattern_severity AS ENUM ('low','moderate','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_pattern_status AS ENUM ('new','reviewing','actioned','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_safeguarding_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  pattern_type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  summary text,
  severity os_pattern_severity NOT NULL DEFAULT 'moderate',
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count int4 NOT NULL DEFAULT 1,
  linked_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_status os_pattern_status NOT NULL DEFAULT 'new',
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  assigned_manager_id int4,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, young_person_id, pattern_type, category)
);

CREATE TABLE IF NOT EXISTS public.os_contextual_risk_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  indicator_type text NOT NULL,
  severity os_pattern_severity NOT NULL DEFAULT 'moderate',
  source text NOT NULL,
  summary text NOT NULL,
  linked_pattern_id uuid REFERENCES public.os_safeguarding_patterns(id) ON DELETE SET NULL,
  linked_chronology_event_id uuid REFERENCES public.os_chronology_events(id) ON DELETE SET NULL,
  identified_at timestamptz NOT NULL DEFAULT now(),
  requires_strategy_discussion boolean NOT NULL DEFAULT false,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  rule_key text NOT NULL,
  rule_name text NOT NULL,
  trigger_type text NOT NULL,
  threshold_count int4 NOT NULL,
  threshold_window_hours int4 NOT NULL,
  severity os_pattern_severity NOT NULL DEFAULT 'moderate',
  enabled boolean NOT NULL DEFAULT true,
  auto_create_command boolean NOT NULL DEFAULT true,
  auto_notify_management boolean NOT NULL DEFAULT true,
  recommended_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (provider_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_os_patterns_home_status ON public.os_safeguarding_patterns(home_id, escalation_status, severity, last_detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_patterns_yp ON public.os_safeguarding_patterns(young_person_id, pattern_type, last_detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_contextual_indicators_yp ON public.os_contextual_risk_indicators(young_person_id, indicator_type, identified_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_escalation_rules_trigger ON public.os_escalation_rules(trigger_type, enabled);

INSERT INTO public.os_escalation_rules (
  provider_id, rule_key, rule_name, trigger_type, threshold_count, threshold_window_hours,
  severity, auto_create_command, auto_notify_management, recommended_response
) VALUES
  (NULL, 'missing_3_in_14_days', 'Three missing episodes in fourteen days', 'missing_from_care', 3, 336, 'high', true, true,
   'Complete missing-from-care pattern review, update risk assessment, consider strategy discussion and review placement plan.'),
  (NULL, 'restraint_5_in_7_days', 'Five physical interventions in seven days', 'physical_intervention', 5, 168, 'high', true, true,
   'Review behaviour support plan, debrief staff and young person, consider external professional input.'),
  (NULL, 'police_3_in_30_days', 'Three police involvements in thirty days', 'police_involvement', 3, 720, 'high', true, true,
   'Review safeguarding plan, professional network involvement and contextual risks.'),
  (NULL, 'med_refusal_4_in_5_days', 'Four medication refusals in five days', 'medication_refusal', 4, 120, 'moderate', true, true,
   'Review medication support plan, consult health professional and record management oversight.'),
  (NULL, 'reg40_2_in_30_days', 'Two Regulation 40 notifications in thirty days', 'reg40', 2, 720, 'high', true, true,
   'Complete leadership safeguarding review and identify learning/actions.')
ON CONFLICT (provider_id, rule_key) DO UPDATE SET
  rule_name = EXCLUDED.rule_name,
  trigger_type = EXCLUDED.trigger_type,
  threshold_count = EXCLUDED.threshold_count,
  threshold_window_hours = EXCLUDED.threshold_window_hours,
  severity = EXCLUDED.severity,
  auto_create_command = EXCLUDED.auto_create_command,
  auto_notify_management = EXCLUDED.auto_notify_management,
  recommended_response = EXCLUDED.recommended_response,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.os_pattern_upsert(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_pattern_type text,
  p_category text,
  p_title text,
  p_summary text,
  p_severity os_pattern_severity,
  p_confidence_score numeric,
  p_occurrence_count int4,
  p_linked_events jsonb,
  p_risk_indicators jsonb,
  p_recommended_actions jsonb,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_command_id uuid;
  v_pattern_id uuid;
BEGIN
  IF p_severity IN ('high','critical') THEN
    v_command_id := public.os_command_create_manual_item(
      'incident_manager_review',
      p_provider_id,
      p_home_id,
      p_young_person_id,
      NULL,
      p_summary,
      'os_safeguarding_patterns',
      NULL,
      now() + interval '24 hours',
      p_created_by,
      jsonb_build_object('pattern_type', p_pattern_type, 'category', p_category, 'severity', p_severity)
    );
  END IF;

  INSERT INTO public.os_safeguarding_patterns (
    provider_id, home_id, young_person_id, pattern_type, category, title, summary,
    severity, confidence_score, occurrence_count, linked_events, risk_indicators,
    recommended_actions, command_item_id, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_pattern_type, p_category, p_title, p_summary,
    p_severity, coalesce(p_confidence_score, 0), coalesce(p_occurrence_count, 1),
    coalesce(p_linked_events, '[]'::jsonb), coalesce(p_risk_indicators, '[]'::jsonb),
    coalesce(p_recommended_actions, '[]'::jsonb), v_command_id, p_created_by
  )
  ON CONFLICT (home_id, young_person_id, pattern_type, category) DO UPDATE SET
    summary = EXCLUDED.summary,
    severity = EXCLUDED.severity,
    confidence_score = EXCLUDED.confidence_score,
    occurrence_count = EXCLUDED.occurrence_count,
    linked_events = EXCLUDED.linked_events,
    risk_indicators = EXCLUDED.risk_indicators,
    recommended_actions = EXCLUDED.recommended_actions,
    command_item_id = coalesce(public.os_safeguarding_patterns.command_item_id, EXCLUDED.command_item_id),
    last_detected_at = now(),
    updated_at = now()
  RETURNING id INTO v_pattern_id;

  PERFORM public.os_chronology_add_event(
    'safeguarding_pattern_detected',
    p_title,
    p_summary,
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    now(),
    'os_safeguarding_patterns',
    NULL,
    v_command_id,
    'helped_and_protected',
    ARRAY['Safeguarding pattern','Contextual safeguarding'],
    coalesce(p_linked_events, '[]'::jsonb),
    'manager',
    true,
    p_created_by,
    jsonb_build_object('pattern_id', v_pattern_id, 'severity', p_severity)
  );

  PERFORM public.os_live_emit(
    'ai.recommendation.created',
    'os_safeguarding_patterns',
    v_pattern_id::text,
    p_title,
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    jsonb_build_object('severity', p_severity, 'confidence_score', p_confidence_score),
    ARRAY['senior','manager','responsible_individual'],
    p_created_by
  );

  RETURN v_pattern_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_detect_safeguarding_patterns(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4 DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS TABLE(pattern_id uuid, pattern_type text, severity text, occurrence_count int4)
LANGUAGE plpgsql
AS $$
DECLARE
  v_yp record;
  v_count int4;
  v_pattern uuid;
  v_events jsonb;
BEGIN
  FOR v_yp IN
    SELECT DISTINCT young_person_id
    FROM public.os_chronology_events
    WHERE home_id = p_home_id
      AND young_person_id IS NOT NULL
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
  LOOP
    SELECT count(*), coalesce(jsonb_agg(jsonb_build_object('table','os_missing_from_care_workflows','id',id,'missing_from',missing_from)), '[]'::jsonb)
    INTO v_count, v_events
    FROM public.os_missing_from_care_workflows
    WHERE home_id = p_home_id
      AND young_person_id = v_yp.young_person_id
      AND missing_from > now() - interval '14 days';

    IF v_count >= 3 THEN
      v_pattern := public.os_pattern_upsert(
        p_provider_id, p_home_id, v_yp.young_person_id,
        'repeat_missing_from_care', 'missing_from_care',
        'Escalating missing-from-care pattern detected',
        'Three or more missing-from-care episodes have been recorded within fourteen days. This indicates escalating safeguarding risk and requires manager review.',
        'high', 0.85, v_count, v_events,
        jsonb_build_array('repeat_missing','contextual_safeguarding','placement_instability'),
        jsonb_build_array('Review missing risk assessment','Complete return-home interview analysis','Consider strategy discussion','Update placement plan'),
        p_created_by
      );
      pattern_id := v_pattern; pattern_type := 'repeat_missing_from_care'; severity := 'high'; occurrence_count := v_count; RETURN NEXT;
    END IF;

    SELECT count(*), coalesce(jsonb_agg(jsonb_build_object('table','os_reg40_notifications','id',id,'reason',notification_reason)), '[]'::jsonb)
    INTO v_count, v_events
    FROM public.os_reg40_notifications
    WHERE home_id = p_home_id
      AND young_person_id = v_yp.young_person_id
      AND created_at > now() - interval '30 days';

    IF v_count >= 2 THEN
      v_pattern := public.os_pattern_upsert(
        p_provider_id, p_home_id, v_yp.young_person_id,
        'repeat_reg40_activity', 'safeguarding_notifications',
        'Repeated Regulation 40 notification pattern detected',
        'Two or more Regulation 40 workflows have been created within thirty days. Leadership safeguarding review is required.',
        'high', 0.80, v_count, v_events,
        jsonb_build_array('repeat_notifiable_events','leadership_oversight','safeguarding_pressure'),
        jsonb_build_array('Complete leadership review','Identify learning themes','Update risk and support planning','Review staffing and supervision'),
        p_created_by
      );
      pattern_id := v_pattern; pattern_type := 'repeat_reg40_activity'; severity := 'high'; occurrence_count := v_count; RETURN NEXT;
    END IF;

    SELECT count(*), coalesce(jsonb_agg(jsonb_build_object('table','os_medication_escalations','id',id,'issue_type',issue_type)), '[]'::jsonb)
    INTO v_count, v_events
    FROM public.os_medication_escalations
    WHERE home_id = p_home_id
      AND young_person_id = v_yp.young_person_id
      AND created_at > now() - interval '7 days'
      AND severity IN ('high','critical');

    IF v_count >= 2 THEN
      v_pattern := public.os_pattern_upsert(
        p_provider_id, p_home_id, v_yp.young_person_id,
        'repeat_medication_escalation', 'health_safeguarding',
        'Repeated medication escalation pattern detected',
        'Multiple high-severity medication escalations have been recorded within seven days. Health and safeguarding review is required.',
        'moderate', 0.70, v_count, v_events,
        jsonb_build_array('medication_risk','health_concern','recording_review'),
        jsonb_build_array('Review MAR records','Consult health professional','Review medication support plan','Record management oversight'),
        p_created_by
      );
      pattern_id := v_pattern; pattern_type := 'repeat_medication_escalation'; severity := 'moderate'; occurrence_count := v_count; RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_safeguarding_pattern_board AS
SELECT
  p.id,
  p.provider_id,
  p.home_id,
  p.young_person_id,
  p.pattern_type,
  p.category,
  p.title,
  p.summary,
  p.severity::text AS severity,
  p.confidence_score,
  p.first_detected_at,
  p.last_detected_at,
  p.occurrence_count,
  p.escalation_status::text AS escalation_status,
  p.command_item_id,
  p.assigned_manager_id,
  p.risk_indicators,
  p.recommended_actions,
  CASE
    WHEN p.severity = 'critical' THEN 0
    WHEN p.severity = 'high' THEN 1
    WHEN p.severity = 'moderate' THEN 2
    ELSE 3
  END AS severity_sort
FROM public.os_safeguarding_patterns p
WHERE p.escalation_status IN ('new','reviewing')
ORDER BY severity_sort, p.last_detected_at DESC;

CREATE OR REPLACE VIEW public.vw_os_contextual_risk_board AS
SELECT
  i.id,
  i.provider_id,
  i.home_id,
  i.young_person_id,
  i.indicator_type,
  i.severity::text AS severity,
  i.source,
  i.summary,
  i.linked_pattern_id,
  i.linked_chronology_event_id,
  i.identified_at,
  i.requires_strategy_discussion,
  i.created_at
FROM public.os_contextual_risk_indicators i
ORDER BY
  CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
  i.identified_at DESC;
