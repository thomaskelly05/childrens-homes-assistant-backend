-- IndiCare OS AI-supported manager review engine
-- Creates structured management oversight reviews from command, chronology, risk, pattern and inspection evidence.

DO $$ BEGIN
  CREATE TYPE os_manager_review_type AS ENUM (
    'incident_review',
    'safeguarding_review',
    'missing_review',
    'risk_review',
    'medication_review',
    'shift_review',
    'quality_review',
    'inspection_review',
    'pattern_review'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_manager_review_status AS ENUM ('draft','in_review','approved','rejected','superseded','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_manager_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  staff_id int4,
  review_type os_manager_review_type NOT NULL,
  status os_manager_review_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  context_summary text NOT NULL,
  analysis text,
  manager_evaluation text,
  child_impact text,
  safeguarding_judgement text,
  actions_required jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_assisted boolean NOT NULL DEFAULT true,
  ai_confidence numeric(5,2),
  ai_limitations text,
  reviewed_by int4,
  reviewed_at timestamptz,
  approved_by int4,
  approved_at timestamptz,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_manager_review_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.os_manager_reviews(id) ON DELETE CASCADE,
  source_table text NOT NULL,
  source_id text NOT NULL,
  link_type text NOT NULL DEFAULT 'evidence',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, source_table, source_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_os_manager_reviews_home_status ON public.os_manager_reviews(home_id, status, review_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_manager_reviews_yp ON public.os_manager_reviews(young_person_id, review_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_manager_review_links_review ON public.os_manager_review_links(review_id);

CREATE OR REPLACE FUNCTION public.os_manager_review_generate(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4 DEFAULT NULL,
  p_review_type os_manager_review_type DEFAULT 'safeguarding_review',
  p_title text DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_commands jsonb;
  v_chronology jsonb;
  v_patterns jsonb;
  v_risk jsonb;
  v_context text;
  v_analysis text;
  v_actions jsonb;
  v_id uuid;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
  INTO v_commands
  FROM (
    SELECT id, domain::text AS domain, priority::text AS priority, status::text AS status, title, summary, due_at, created_at
    FROM public.os_command_items
    WHERE home_id = p_home_id
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
      AND status IN ('open','in_progress','waiting')
    ORDER BY
      CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC
    LIMIT 20
  ) c;

  SELECT coalesce(jsonb_agg(to_jsonb(ch)), '[]'::jsonb)
  INTO v_chronology
  FROM (
    SELECT chronology_event_id, event_type, event_title, event_summary, event_at, sccif_area, overlay_count, max_overlay_severity_rank
    FROM public.vw_os_chronology_intelligence
    WHERE home_id = p_home_id
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
    ORDER BY event_at DESC
    LIMIT 20
  ) ch;

  SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
  INTO v_patterns
  FROM (
    SELECT id, pattern_type, category, title, severity::text AS severity, occurrence_count, confidence_score, last_detected_at
    FROM public.os_safeguarding_patterns
    WHERE home_id = p_home_id
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
      AND escalation_status IN ('new','reviewing')
    ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
      last_detected_at DESC
    LIMIT 10
  ) p;

  SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  INTO v_risk
  FROM (
    SELECT overall_risk_level, overall_risk_score, safeguarding_score, missing_risk_score,
           medication_risk_score, compliance_risk_score, inspection_risk_score, ai_summary, calculated_at
    FROM public.vw_os_risk_heatmap
    WHERE home_id = p_home_id
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
    ORDER BY calculated_at DESC
    LIMIT 5
  ) r;

  v_context := concat_ws(
    E'\n\n',
    'Manager review generated from IndiCare OS operational intelligence.',
    'Open command items considered: ' || jsonb_array_length(v_commands),
    'Recent chronology intelligence events considered: ' || jsonb_array_length(v_chronology),
    'Active safeguarding patterns considered: ' || jsonb_array_length(v_patterns),
    'Risk snapshots considered: ' || jsonb_array_length(v_risk)
  );

  v_analysis := concat_ws(
    E'\n\n',
    'Review focus: ' || p_review_type::text,
    CASE WHEN jsonb_array_length(v_patterns) > 0 THEN 'Safeguarding patterns are present and require explicit management evaluation.' ELSE 'No active safeguarding pattern records were found for this scope.' END,
    CASE WHEN jsonb_array_length(v_commands) > 0 THEN 'There are open operational command items requiring oversight and completion tracking.' ELSE 'No open command items were found for this scope.' END,
    'The manager must review source records directly before approval. This draft is decision-support only.'
  );

  v_actions := jsonb_build_array(
    'Review linked chronology and source records',
    'Record professional evaluation and child impact',
    'Confirm safeguarding actions and owners',
    'Update risk assessment or support plan where needed',
    'Record management sign-off once satisfied'
  );

  INSERT INTO public.os_manager_reviews (
    provider_id, home_id, young_person_id, review_type, status, title,
    context_summary, analysis, actions_required, evidence_refs, source_refs,
    ai_assisted, ai_confidence, ai_limitations, created_by
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_young_person_id,
    p_review_type,
    'draft',
    coalesce(p_title, 'Manager review: ' || replace(p_review_type::text, '_', ' ')),
    v_context,
    v_analysis,
    v_actions,
    jsonb_build_object('commands', v_commands, 'chronology', v_chronology, 'patterns', v_patterns, 'risk', v_risk),
    jsonb_build_array(
      jsonb_build_object('source','os_command_items','count',jsonb_array_length(v_commands)),
      jsonb_build_object('source','vw_os_chronology_intelligence','count',jsonb_array_length(v_chronology)),
      jsonb_build_object('source','os_safeguarding_patterns','count',jsonb_array_length(v_patterns)),
      jsonb_build_object('source','vw_os_risk_heatmap','count',jsonb_array_length(v_risk))
    ),
    true,
    0.72,
    'AI-supported review draft. The reviewing manager must check the underlying records, add professional evaluation and approve before this is relied on as management oversight.',
    p_created_by
  ) RETURNING id INTO v_id;

  PERFORM public.os_live_emit(
    'ai.recommendation.created',
    'os_manager_reviews',
    v_id::text,
    coalesce(p_title, 'Manager review generated'),
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    jsonb_build_object('review_type', p_review_type, 'ai_assisted', true),
    ARRAY['senior','manager','responsible_individual'],
    p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_manager_review_approve(
  p_review_id uuid,
  p_manager_evaluation text,
  p_child_impact text DEFAULT NULL,
  p_safeguarding_judgement text DEFAULT NULL,
  p_approved_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_review public.os_manager_reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_review FROM public.os_manager_reviews WHERE id = p_review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manager review not found: %', p_review_id;
  END IF;

  UPDATE public.os_manager_reviews
  SET status = 'approved',
      manager_evaluation = p_manager_evaluation,
      child_impact = p_child_impact,
      safeguarding_judgement = p_safeguarding_judgement,
      reviewed_by = p_approved_by,
      reviewed_at = now(),
      approved_by = p_approved_by,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_review_id;

  PERFORM public.os_chronology_add_event(
    'manager_review_approved',
    v_review.title,
    coalesce(p_manager_evaluation, v_review.analysis),
    v_review.provider_id,
    v_review.home_id,
    v_review.young_person_id,
    v_review.staff_id,
    now(),
    'os_manager_reviews',
    NULL,
    NULL,
    'leadership_management',
    ARRAY['Manager oversight','Leadership and management'],
    jsonb_build_array(jsonb_build_object('table','os_manager_reviews','id',p_review_id)),
    'manager',
    false,
    p_approved_by,
    jsonb_build_object('review_id', p_review_id, 'review_type', v_review.review_type)
  );

  PERFORM public.os_audit_log(
    'manager_review.approved',
    'os_manager_reviews',
    p_review_id::text,
    v_review.provider_id,
    v_review.home_id,
    p_approved_by,
    NULL,
    to_jsonb(v_review),
    jsonb_build_object('status','approved','approved_by',p_approved_by),
    p_manager_evaluation,
    jsonb_build_object('review_type', v_review.review_type)
  );

  RETURN p_review_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_manager_review_board AS
SELECT
  r.id,
  r.provider_id,
  r.home_id,
  r.young_person_id,
  r.staff_id,
  r.review_type::text AS review_type,
  r.status::text AS status,
  r.title,
  r.context_summary,
  r.analysis,
  r.manager_evaluation,
  r.child_impact,
  r.safeguarding_judgement,
  r.actions_required,
  r.ai_assisted,
  r.ai_confidence,
  r.ai_limitations,
  r.reviewed_by,
  r.reviewed_at,
  r.approved_by,
  r.approved_at,
  r.created_at,
  r.updated_at,
  CASE
    WHEN r.status = 'draft' AND r.created_at < now() - interval '7 days' THEN 'overdue_draft'
    WHEN r.status = 'draft' THEN 'awaiting_review'
    WHEN r.status = 'approved' THEN 'approved'
    ELSE r.status::text
  END AS board_state
FROM public.os_manager_reviews r
ORDER BY
  CASE
    WHEN r.status = 'draft' AND r.created_at < now() - interval '7 days' THEN 0
    WHEN r.status = 'draft' THEN 1
    WHEN r.status = 'in_review' THEN 2
    ELSE 3
  END,
  r.created_at DESC;
