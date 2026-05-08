-- IndiCare OS existing young people schema bridge
-- Uses the existing young_people and daily_notes schema as the operational source of truth.
-- This avoids duplicating the core child profile model while allowing the OS command layer to aggregate it.

CREATE OR REPLACE VIEW public.vw_os_young_person_profile AS
SELECT
  yp.id AS young_person_id,
  yp.home_id,
  NULL::int4 AS provider_id,
  yp.first_name,
  yp.last_name,
  yp.preferred_name,
  coalesce(yp.preferred_name, yp.first_name) AS display_name,
  yp.date_of_birth,
  date_part('year', age(current_date, yp.date_of_birth))::int4 AS age,
  yp.gender,
  yp.ethnicity,
  yp.nhs_number,
  yp.local_id_number,
  yp.admission_date,
  yp.discharge_date,
  yp.placement_status,
  yp.primary_keyworker_id,
  yp.summary_risk_level,
  yp.photo_url,
  yp.archived,
  yp.created_at,
  yp.updated_at,
  coalesce(dn.records_today, 0) AS records_today,
  coalesce(dn.daily_notes_7_days, 0) AS daily_notes_7_days,
  coalesce(dn.manager_review_count, 0) AS manager_review_count,
  coalesce(osr.os_care_records_7_days, 0) AS os_care_records_7_days,
  coalesce(cmd.open_commands, 0) AS open_commands,
  coalesce(cmd.critical_commands, 0) AS critical_commands,
  coalesce(ps.risk_level, 'unknown') AS placement_stability_level,
  coalesce(ps.disruption_risk_score, 0) AS disruption_risk_score,
  coalesce(ps.stability_score, 100) AS stability_score,
  coalesce(sp.active_patterns, 0) AS active_safeguarding_patterns,
  coalesce(sp.high_patterns, 0) AS high_safeguarding_patterns,
  coalesce(net.network_alerts, 0) AS network_alerts,
  CASE
    WHEN coalesce(cmd.critical_commands, 0) > 0 OR coalesce(sp.high_patterns, 0) > 0 THEN 'critical'
    WHEN coalesce(ps.disruption_risk_score, 0) >= 55 OR coalesce(net.network_alerts, 0) > 0 THEN 'high'
    WHEN coalesce(dn.manager_review_count, 0) > 0 THEN 'monitor'
    ELSE 'stable'
  END AS os_state
FROM public.young_people yp
LEFT JOIN (
  SELECT
    young_person_id,
    count(*) FILTER (WHERE note_date = current_date) AS records_today,
    count(*) FILTER (WHERE note_date >= current_date - interval '7 days') AS daily_notes_7_days,
    count(*) FILTER (WHERE lower(coalesce(workflow_status, 'draft')) IN ('submitted','returned','manager_review')) AS manager_review_count
  FROM public.daily_notes
  GROUP BY young_person_id
) dn ON dn.young_person_id = yp.id
LEFT JOIN (
  SELECT
    young_person_id,
    count(*) FILTER (WHERE record_date >= current_date - interval '7 days') AS os_care_records_7_days
  FROM public.os_young_person_care_records
  GROUP BY young_person_id
) osr ON osr.young_person_id = yp.id
LEFT JOIN (
  SELECT
    young_person_id,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting')) AS open_commands,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND priority = 'critical') AS critical_commands
  FROM public.os_command_items
  GROUP BY young_person_id
) cmd ON cmd.young_person_id = yp.id
LEFT JOIN public.vw_os_placement_stability_board ps ON ps.young_person_id = yp.id
LEFT JOIN (
  SELECT
    young_person_id,
    count(*) FILTER (WHERE escalation_status IN ('new','reviewing')) AS active_patterns,
    count(*) FILTER (WHERE escalation_status IN ('new','reviewing') AND severity IN ('high','critical')) AS high_patterns
  FROM public.os_safeguarding_patterns
  GROUP BY young_person_id
) sp ON sp.young_person_id = yp.id
LEFT JOIN (
  SELECT young_person_id, count(*) AS network_alerts
  FROM public.os_network_risk_alerts
  WHERE status IN ('new','reviewing')
  GROUP BY young_person_id
) net ON net.young_person_id = yp.id;

CREATE OR REPLACE VIEW public.vw_os_young_person_timeline AS
SELECT
  ('daily_notes:' || dn.id)::text AS timeline_id,
  dn.young_person_id,
  dn.home_id,
  'daily_note'::text AS source_type,
  dn.id::text AS source_id,
  dn.note_date::timestamptz AS occurred_at,
  concat(coalesce(nullif(dn.shift_type, ''), 'Shift'), ' daily note') AS title,
  concat_ws(' | ', dn.positives, dn.presentation, dn.behaviour_update, dn.actions_required) AS summary,
  dn.young_person_voice AS child_voice,
  dn.workflow_status AS status,
  CASE
    WHEN lower(coalesce(dn.workflow_status, 'draft')) IN ('submitted','returned','manager_review') THEN 'requires_manager_review'
    ELSE 'recorded'
  END AS timeline_state,
  jsonb_build_object(
    'mood', dn.mood,
    'presentation', dn.presentation,
    'activities', dn.activities,
    'education_update', dn.education_update,
    'health_update', dn.health_update,
    'family_update', dn.family_update,
    'behaviour_update', dn.behaviour_update,
    'actions_required', dn.actions_required,
    'significance', dn.significance
  ) AS metadata
FROM public.daily_notes dn
UNION ALL
SELECT
  ('os_care_records:' || r.id)::text AS timeline_id,
  r.young_person_id,
  r.home_id,
  r.record_type::text AS source_type,
  r.id::text AS source_id,
  r.occurred_at,
  r.title,
  r.narrative AS summary,
  r.child_voice,
  r.status::text AS status,
  CASE
    WHEN r.manager_review_required THEN 'requires_manager_review'
    WHEN r.safeguarding_relevant THEN 'safeguarding_relevant'
    ELSE 'recorded'
  END AS timeline_state,
  jsonb_build_object(
    'mood', r.mood,
    'presentation', r.presentation,
    'location', r.location,
    'sccif_area', r.sccif_area,
    'safeguarding_relevant', r.safeguarding_relevant,
    'sensitivity', r.sensitivity,
    'tags', r.tags
  ) AS metadata
FROM public.os_young_person_care_records r;

CREATE OR REPLACE FUNCTION public.os_sync_care_record_to_daily_notes(
  p_care_record_id uuid
)
RETURNS int4
LANGUAGE plpgsql
AS $$
DECLARE
  v_record public.os_young_person_care_records%ROWTYPE;
  v_daily_note_id int4;
  v_shift text;
BEGIN
  SELECT * INTO v_record FROM public.os_young_person_care_records WHERE id = p_care_record_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care record not found: %', p_care_record_id;
  END IF;

  IF v_record.record_type NOT IN ('daily_record','observation','emotional_wellbeing_note','behaviour_note','positive_outcome','concern') THEN
    RETURN NULL;
  END IF;

  v_shift := CASE
    WHEN extract(hour FROM v_record.occurred_at) < 12 THEN 'morning'
    WHEN extract(hour FROM v_record.occurred_at) < 17 THEN 'afternoon'
    WHEN extract(hour FROM v_record.occurred_at) < 22 THEN 'evening'
    ELSE 'night'
  END;

  INSERT INTO public.daily_notes (
    young_person_id,
    home_id,
    note_date,
    shift_type,
    mood,
    presentation,
    activities,
    education_update,
    health_update,
    family_update,
    behaviour_update,
    young_person_voice,
    positives,
    actions_required,
    significance,
    workflow_status,
    manager_review_comment,
    submitted_at,
    last_edited_at,
    author_id,
    created_at,
    updated_at
  ) VALUES (
    v_record.young_person_id,
    v_record.home_id,
    v_record.record_date,
    v_shift,
    v_record.mood,
    coalesce(v_record.presentation, v_record.narrative),
    CASE WHEN v_record.record_type = 'daily_record' THEN v_record.narrative ELSE NULL END,
    CASE WHEN v_record.record_type = 'education_note' THEN v_record.narrative ELSE NULL END,
    CASE WHEN v_record.record_type = 'health_note' THEN v_record.narrative ELSE NULL END,
    CASE WHEN v_record.record_type = 'family_contact' THEN v_record.narrative ELSE NULL END,
    CASE WHEN v_record.record_type IN ('behaviour_note','concern') THEN v_record.narrative ELSE NULL END,
    v_record.child_voice,
    CASE WHEN v_record.record_type = 'positive_outcome' THEN v_record.narrative ELSE NULL END,
    v_record.follow_up_summary,
    CASE WHEN v_record.safeguarding_relevant OR v_record.manager_review_required THEN 'high' ELSE 'medium' END,
    CASE WHEN v_record.manager_review_required THEN 'submitted' ELSE 'approved' END,
    v_record.manager_comment,
    now(),
    now(),
    v_record.created_by,
    now(),
    now()
  ) RETURNING id INTO v_daily_note_id;

  UPDATE public.os_young_person_care_records
  SET linked_records = linked_records || jsonb_build_array(jsonb_build_object('table','daily_notes','id',v_daily_note_id)),
      updated_at = now()
  WHERE id = p_care_record_id;

  RETURN v_daily_note_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_create_care_record(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_record_type os_care_record_type,
  p_title text,
  p_narrative text,
  p_child_voice text DEFAULT NULL,
  p_staff_analysis text DEFAULT NULL,
  p_impact_on_child text DEFAULT NULL,
  p_actions_taken jsonb DEFAULT '[]'::jsonb,
  p_follow_up_required boolean DEFAULT false,
  p_follow_up_summary text DEFAULT NULL,
  p_mood text DEFAULT NULL,
  p_presentation text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_sccif_area text DEFAULT NULL,
  p_safeguarding_relevant boolean DEFAULT false,
  p_sensitivity os_record_sensitivity DEFAULT 'standard',
  p_tags text[] DEFAULT ARRAY[]::text[],
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_chronology_id uuid;
  v_manager_review boolean;
  v_daily_note_id int4;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.young_people WHERE id = p_young_person_id AND home_id = p_home_id) THEN
    RAISE EXCEPTION 'Young person % not found in home %', p_young_person_id, p_home_id;
  END IF;

  v_manager_review := p_follow_up_required OR p_safeguarding_relevant OR p_record_type IN ('incident_note','concern','risk_assessment_update');

  INSERT INTO public.os_young_person_care_records (
    provider_id, home_id, young_person_id, record_type, title, narrative, child_voice,
    staff_analysis, impact_on_child, actions_taken, follow_up_required, follow_up_summary,
    mood, presentation, location, sccif_area, safeguarding_relevant, sensitivity, tags,
    manager_review_required, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_record_type, p_title, p_narrative, p_child_voice,
    p_staff_analysis, p_impact_on_child, coalesce(p_actions_taken, '[]'::jsonb), p_follow_up_required, p_follow_up_summary,
    p_mood, p_presentation, p_location, p_sccif_area, p_safeguarding_relevant, p_sensitivity, coalesce(p_tags, ARRAY[]::text[]),
    v_manager_review, p_created_by
  ) RETURNING id INTO v_id;

  v_daily_note_id := public.os_sync_care_record_to_daily_notes(v_id);

  v_chronology_id := public.os_chronology_add_event(
    'care_record_' || p_record_type::text,
    p_title,
    p_narrative,
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    now(),
    'os_young_person_care_records',
    NULL,
    NULL,
    coalesce(p_sccif_area, CASE WHEN p_safeguarding_relevant THEN 'helped_and_protected' ELSE 'children_experiences_progress' END),
    ARRAY['Care recording'],
    jsonb_build_array(jsonb_build_object('table','os_young_person_care_records','id',v_id), jsonb_build_object('table','daily_notes','id',v_daily_note_id)),
    CASE WHEN p_sensitivity = 'restricted' THEN 'manager' ELSE 'staff' END,
    p_sensitivity <> 'standard',
    p_created_by,
    jsonb_build_object('care_record_id', v_id, 'daily_note_id', v_daily_note_id, 'record_type', p_record_type, 'manager_review_required', v_manager_review)
  );

  IF v_manager_review THEN
    PERFORM public.os_command_create_manual_item(
      'incident_manager_review',
      p_provider_id,
      p_home_id,
      p_young_person_id,
      NULL,
      'Care record requires management review: ' || p_title,
      'os_young_person_care_records',
      NULL,
      now() + interval '48 hours',
      p_created_by,
      jsonb_build_object('care_record_id', v_id, 'daily_note_id', v_daily_note_id, 'chronology_event_id', v_chronology_id)
    );
  END IF;

  RETURN v_id;
END;
$$;
