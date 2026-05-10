-- IndiCare OS chronology intelligence overlays
-- Adds timeline overlays for risk, safeguarding patterns, contextual safeguarding and inspection relevance.

DO $$ BEGIN
  CREATE TYPE os_timeline_overlay_type AS ENUM (
    'risk',
    'safeguarding_pattern',
    'contextual_risk',
    'inspection_evidence',
    'manager_review',
    'placement_stability',
    'emotional_wellbeing',
    'multi_agency'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_chronology_overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  chronology_event_id uuid REFERENCES public.os_chronology_events(id) ON DELETE CASCADE,
  overlay_type os_timeline_overlay_type NOT NULL,
  title text NOT NULL,
  summary text,
  severity os_pattern_severity NOT NULL DEFAULT 'moderate',
  confidence_score numeric(5,2) DEFAULT 0,
  source_table text,
  source_id text,
  sccif_area text CHECK (sccif_area IS NULL OR sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  regulation_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  display_colour text,
  visible_to_roles text[] NOT NULL DEFAULT ARRAY['senior','manager','responsible_individual'],
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (chronology_event_id, overlay_type, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_os_chronology_overlays_event ON public.os_chronology_overlays(chronology_event_id);
CREATE INDEX IF NOT EXISTS idx_os_chronology_overlays_home_yp ON public.os_chronology_overlays(home_id, young_person_id, overlay_type, severity);

CREATE OR REPLACE FUNCTION public.os_chronology_add_overlay(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_chronology_event_id uuid,
  p_overlay_type os_timeline_overlay_type,
  p_title text,
  p_summary text DEFAULT NULL,
  p_severity os_pattern_severity DEFAULT 'moderate',
  p_confidence_score numeric DEFAULT 0,
  p_source_table text DEFAULT NULL,
  p_source_id text DEFAULT NULL,
  p_sccif_area text DEFAULT NULL,
  p_regulation_refs text[] DEFAULT ARRAY[]::text[],
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_colour text;
BEGIN
  v_colour := CASE p_severity
    WHEN 'critical' THEN '#dc2626'
    WHEN 'high' THEN '#ea580c'
    WHEN 'moderate' THEN '#ca8a04'
    ELSE '#16a34a'
  END;

  INSERT INTO public.os_chronology_overlays (
    provider_id, home_id, young_person_id, chronology_event_id, overlay_type, title, summary,
    severity, confidence_score, source_table, source_id, sccif_area, regulation_refs,
    display_colour, created_by, metadata
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_chronology_event_id, p_overlay_type, p_title, p_summary,
    p_severity, coalesce(p_confidence_score, 0), p_source_table, p_source_id, p_sccif_area,
    coalesce(p_regulation_refs, ARRAY[]::text[]), v_colour, p_created_by, coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (chronology_event_id, overlay_type, source_table, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    severity = EXCLUDED.severity,
    confidence_score = EXCLUDED.confidence_score,
    display_colour = EXCLUDED.display_colour,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_generate_chronology_overlays(
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
  v_event record;
  v_pattern record;
  v_indicator record;
  v_overlay uuid;
BEGIN
  FOR v_pattern IN
    SELECT *
    FROM public.os_safeguarding_patterns
    WHERE home_id = p_home_id
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
      AND escalation_status IN ('new','reviewing')
  LOOP
    FOR v_event IN
      SELECT *
      FROM public.os_chronology_events
      WHERE home_id = p_home_id
        AND young_person_id = v_pattern.young_person_id
        AND event_at >= v_pattern.first_detected_at - interval '30 days'
        AND event_at <= v_pattern.last_detected_at + interval '1 day'
      ORDER BY event_at DESC
      LIMIT 20
    LOOP
      v_overlay := public.os_chronology_add_overlay(
        v_pattern.provider_id,
        v_pattern.home_id,
        v_pattern.young_person_id,
        v_event.id,
        'safeguarding_pattern',
        v_pattern.title,
        v_pattern.summary,
        v_pattern.severity,
        v_pattern.confidence_score,
        'os_safeguarding_patterns',
        v_pattern.id::text,
        'helped_and_protected',
        ARRAY['Safeguarding pattern','Contextual safeguarding'],
        p_created_by,
        jsonb_build_object('pattern_type', v_pattern.pattern_type, 'occurrence_count', v_pattern.occurrence_count)
      );
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  FOR v_indicator IN
    SELECT *
    FROM public.os_contextual_risk_indicators
    WHERE home_id = p_home_id
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
  LOOP
    SELECT * INTO v_event
    FROM public.os_chronology_events
    WHERE id = v_indicator.linked_chronology_event_id
       OR (
         home_id = v_indicator.home_id
         AND young_person_id = v_indicator.young_person_id
         AND event_at BETWEEN v_indicator.identified_at - interval '7 days' AND v_indicator.identified_at + interval '1 day'
       )
    ORDER BY event_at DESC
    LIMIT 1;

    IF FOUND THEN
      v_overlay := public.os_chronology_add_overlay(
        v_indicator.provider_id,
        v_indicator.home_id,
        v_indicator.young_person_id,
        v_event.id,
        'contextual_risk',
        'Contextual risk indicator: ' || v_indicator.indicator_type,
        v_indicator.summary,
        v_indicator.severity,
        0.75,
        'os_contextual_risk_indicators',
        v_indicator.id::text,
        'helped_and_protected',
        ARRAY['Contextual safeguarding'],
        p_created_by,
        jsonb_build_object('requires_strategy_discussion', v_indicator.requires_strategy_discussion)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  INSERT INTO public.os_chronology_overlays (
    provider_id, home_id, young_person_id, chronology_event_id, overlay_type, title, summary,
    severity, confidence_score, source_table, source_id, sccif_area, regulation_refs,
    display_colour, created_by, metadata
  )
  SELECT
    c.provider_id,
    c.home_id,
    c.young_person_id,
    c.id,
    'inspection_evidence',
    'Inspection relevant event',
    coalesce(c.event_summary, c.event_title),
    CASE WHEN c.sccif_area = 'helped_and_protected' THEN 'high'::os_pattern_severity ELSE 'moderate'::os_pattern_severity END,
    0.65,
    'os_chronology_events',
    c.id::text,
    c.sccif_area,
    c.regulation_refs,
    CASE WHEN c.sccif_area = 'helped_and_protected' THEN '#ea580c' ELSE '#2563eb' END,
    p_created_by,
    jsonb_build_object('generated_by','os_generate_chronology_overlays')
  FROM public.os_chronology_events c
  WHERE c.home_id = p_home_id
    AND (p_young_person_id IS NULL OR c.young_person_id = p_young_person_id)
    AND c.sccif_area IS NOT NULL
  ON CONFLICT (chronology_event_id, overlay_type, source_table, source_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_chronology_intelligence AS
SELECT
  c.id AS chronology_event_id,
  c.provider_id,
  c.home_id,
  c.young_person_id,
  c.event_type,
  c.event_title,
  c.event_summary,
  c.event_at,
  c.source_table,
  c.source_id,
  c.command_item_id,
  c.sccif_area,
  c.regulation_refs,
  c.visibility,
  c.is_sensitive,
  coalesce(jsonb_agg(jsonb_build_object(
    'overlay_id', o.id,
    'overlay_type', o.overlay_type::text,
    'title', o.title,
    'summary', o.summary,
    'severity', o.severity::text,
    'confidence_score', o.confidence_score,
    'source_table', o.source_table,
    'source_id', o.source_id,
    'display_colour', o.display_colour,
    'metadata', o.metadata
  )) FILTER (WHERE o.id IS NOT NULL), '[]'::jsonb) AS overlays,
  count(o.id) FILTER (WHERE o.id IS NOT NULL) AS overlay_count,
  max(CASE o.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'moderate' THEN 2 WHEN 'low' THEN 1 ELSE 0 END) AS max_overlay_severity_rank
FROM public.os_chronology_events c
LEFT JOIN public.os_chronology_overlays o ON o.chronology_event_id = c.id
GROUP BY c.id;
