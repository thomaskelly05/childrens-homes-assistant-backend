-- IndiCare OS multi-child contextual safeguarding intelligence
-- Detects shared risks, peer clusters, exploitation indicators and contextual safeguarding themes across children.

DO $$ BEGIN
  CREATE TYPE os_contextual_cluster_status AS ENUM ('new','reviewing','actioned','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_contextual_safeguarding_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  cluster_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  severity os_pattern_severity NOT NULL DEFAULT 'moderate',
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  young_person_ids int4[] NOT NULL DEFAULT ARRAY[]::int4[],
  linked_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_chronology jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_themes jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  status os_contextual_cluster_status NOT NULL DEFAULT 'new',
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, cluster_type, title)
);

CREATE INDEX IF NOT EXISTS idx_os_contextual_clusters_home_status
  ON public.os_contextual_safeguarding_clusters(home_id, status, severity, last_detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_contextual_clusters_yp_gin
  ON public.os_contextual_safeguarding_clusters USING gin(young_person_ids);

CREATE OR REPLACE FUNCTION public.os_detect_contextual_safeguarding_clusters(
  p_provider_id int4,
  p_home_id int4,
  p_created_by int4 DEFAULT NULL
)
RETURNS int4
LANGUAGE plpgsql
AS $$
DECLARE
  v_record record;
  v_command_id uuid;
  v_count int4 := 0;
BEGIN
  -- Shared high-risk locations, external contacts or online contacts linked to two or more young people.
  FOR v_record IN
    SELECT
      target.id AS target_node_id,
      target.display_name AS target_name,
      target.node_type::text AS target_type,
      count(DISTINCT source.young_person_id) AS child_count,
      array_agg(DISTINCT source.young_person_id) FILTER (WHERE source.young_person_id IS NOT NULL) AS yp_ids,
      jsonb_agg(DISTINCT jsonb_build_object('node_id', source.id, 'young_person_id', source.young_person_id, 'name', source.display_name)) AS child_nodes,
      jsonb_agg(DISTINCT jsonb_build_object('edge_id', e.id, 'edge_type', e.edge_type::text, 'strength', e.strength, 'risk_level', e.risk_level::text)) AS edges,
      max(CASE e.risk_level WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'moderate' THEN 2 ELSE 1 END) AS risk_rank
    FROM public.os_safeguarding_network_edges e
    JOIN public.os_safeguarding_network_nodes source ON source.id = e.source_node_id
    JOIN public.os_safeguarding_network_nodes target ON target.id = e.target_node_id
    WHERE e.home_id = p_home_id
      AND e.active = true
      AND source.node_type = 'young_person'
      AND target.node_type IN ('location','external_person','online_contact','risk_theme','peer')
      AND e.edge_type IN ('missing_location','risk_location','exploitation_concern','online_contact','peer_relationship','associated_with')
    GROUP BY target.id, target.display_name, target.node_type
    HAVING count(DISTINCT source.young_person_id) >= 2
  LOOP
    v_command_id := public.os_command_create_manual_item(
      'incident_manager_review',
      p_provider_id,
      p_home_id,
      NULL,
      NULL,
      'Multi-child contextual safeguarding cluster detected: ' || v_record.target_name || '. Review shared risks, peer influence, exploitation indicators and multi-agency response.',
      'os_contextual_safeguarding_clusters',
      NULL,
      now() + interval '24 hours',
      p_created_by,
      jsonb_build_object('target_node_id', v_record.target_node_id, 'child_count', v_record.child_count)
    );

    INSERT INTO public.os_contextual_safeguarding_clusters (
      provider_id, home_id, cluster_type, title, summary, severity, confidence_score,
      young_person_ids, linked_nodes, linked_edges, risk_themes, recommended_actions,
      command_item_id, created_by, metadata
    ) VALUES (
      p_provider_id,
      p_home_id,
      'shared_contextual_risk',
      'Shared contextual safeguarding cluster: ' || v_record.target_name,
      'Two or more young people are linked to the same ' || replace(v_record.target_type, '_', ' ') || '. This may indicate shared contextual safeguarding, exploitation, peer influence or risk-location concerns.',
      CASE WHEN v_record.risk_rank >= 4 THEN 'critical'::os_pattern_severity WHEN v_record.risk_rank >= 3 THEN 'high'::os_pattern_severity ELSE 'moderate'::os_pattern_severity END,
      CASE WHEN v_record.child_count >= 3 THEN 0.88 ELSE 0.76 END,
      coalesce(v_record.yp_ids, ARRAY[]::int4[]),
      coalesce(v_record.child_nodes, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('node_id', v_record.target_node_id, 'name', v_record.target_name, 'type', v_record.target_type)),
      coalesce(v_record.edges, '[]'::jsonb),
      jsonb_build_array(v_record.target_type, 'contextual_safeguarding', 'multi_child_risk'),
      jsonb_build_array(
        'Review linked young people and chronology together',
        'Consider contextual safeguarding or exploitation discussion',
        'Review missing-from-care themes and locations',
        'Record management evaluation and multi-agency actions',
        'Update individual risk assessments and placement plans'
      ),
      v_command_id,
      p_created_by,
      jsonb_build_object('target_node_id', v_record.target_node_id, 'target_type', v_record.target_type, 'child_count', v_record.child_count)
    )
    ON CONFLICT (home_id, cluster_type, title) DO UPDATE SET
      summary = EXCLUDED.summary,
      severity = EXCLUDED.severity,
      confidence_score = EXCLUDED.confidence_score,
      young_person_ids = EXCLUDED.young_person_ids,
      linked_nodes = EXCLUDED.linked_nodes,
      linked_edges = EXCLUDED.linked_edges,
      risk_themes = EXCLUDED.risk_themes,
      recommended_actions = EXCLUDED.recommended_actions,
      command_item_id = coalesce(public.os_contextual_safeguarding_clusters.command_item_id, EXCLUDED.command_item_id),
      status = CASE WHEN public.os_contextual_safeguarding_clusters.status = 'closed' THEN 'reviewing'::os_contextual_cluster_status ELSE public.os_contextual_safeguarding_clusters.status END,
      last_detected_at = now(),
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  PERFORM public.os_live_emit(
    'ai.recommendation.created',
    'os_contextual_safeguarding_clusters',
    p_home_id::text,
    'Multi-child contextual safeguarding scan completed',
    p_provider_id,
    p_home_id,
    NULL,
    NULL,
    jsonb_build_object('clusters_detected', v_count),
    ARRAY['senior','manager','responsible_individual'],
    p_created_by
  );

  RETURN v_count;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_contextual_cluster_board AS
SELECT
  c.id,
  c.provider_id,
  c.home_id,
  c.cluster_type,
  c.title,
  c.summary,
  c.severity::text AS severity,
  c.confidence_score,
  c.young_person_ids,
  c.linked_nodes,
  c.linked_edges,
  c.linked_chronology,
  c.risk_themes,
  c.recommended_actions,
  c.command_item_id,
  c.status::text AS status,
  c.first_detected_at,
  c.last_detected_at,
  c.created_at,
  CASE c.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END AS severity_sort
FROM public.os_contextual_safeguarding_clusters c
WHERE c.status IN ('new','reviewing')
ORDER BY severity_sort, c.last_detected_at DESC;

CREATE OR REPLACE VIEW public.vw_os_multi_child_contextual_summary AS
SELECT
  provider_id,
  home_id,
  count(*) FILTER (WHERE severity='critical') AS critical_clusters,
  count(*) FILTER (WHERE severity='high') AS high_clusters,
  count(*) AS active_clusters,
  count(DISTINCT unnest_young_person_id) AS children_in_clusters,
  max(last_detected_at) AS latest_detected_at
FROM (
  SELECT
    c.provider_id,
    c.home_id,
    c.severity,
    c.last_detected_at,
    unnest(c.young_person_ids) AS unnest_young_person_id
  FROM public.os_contextual_safeguarding_clusters c
  WHERE c.status IN ('new','reviewing')
) x
GROUP BY provider_id, home_id;
