-- IndiCare OS safeguarding relationship and network mapping
-- Connects young people, peers, locations, external contacts, missing episodes and contextual safeguarding indicators.

DO $$ BEGIN
  CREATE TYPE os_network_node_type AS ENUM (
    'young_person',
    'staff',
    'peer',
    'family_member',
    'external_person',
    'location',
    'online_contact',
    'professional',
    'organisation',
    'risk_theme'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_network_edge_type AS ENUM (
    'associated_with',
    'missing_location',
    'risk_location',
    'peer_relationship',
    'family_relationship',
    'professional_relationship',
    'online_contact',
    'exploitation_concern',
    'conflict',
    'protective_relationship',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_safeguarding_network_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  node_type os_network_node_type NOT NULL,
  display_name text NOT NULL,
  young_person_id int4,
  staff_id int4,
  external_reference text,
  risk_level os_pattern_severity NOT NULL DEFAULT 'moderate',
  is_sensitive boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (home_id, node_type, display_name, young_person_id, staff_id, external_reference)
);

CREATE TABLE IF NOT EXISTS public.os_safeguarding_network_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  source_node_id uuid NOT NULL REFERENCES public.os_safeguarding_network_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.os_safeguarding_network_nodes(id) ON DELETE CASCADE,
  edge_type os_network_edge_type NOT NULL DEFAULT 'associated_with',
  strength numeric(5,2) NOT NULL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  risk_level os_pattern_severity NOT NULL DEFAULT 'moderate',
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrence_count int4 NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_node_id, target_node_id, edge_type)
);

CREATE TABLE IF NOT EXISTS public.os_network_risk_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  alert_type text NOT NULL,
  severity os_pattern_severity NOT NULL DEFAULT 'moderate',
  title text NOT NULL,
  summary text NOT NULL,
  linked_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  status os_pattern_status NOT NULL DEFAULT 'new',
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_network_nodes_home_type ON public.os_safeguarding_network_nodes(home_id, node_type, risk_level);
CREATE INDEX IF NOT EXISTS idx_os_network_nodes_yp ON public.os_safeguarding_network_nodes(young_person_id);
CREATE INDEX IF NOT EXISTS idx_os_network_edges_home_type ON public.os_safeguarding_network_edges(home_id, edge_type, risk_level, active);
CREATE INDEX IF NOT EXISTS idx_os_network_alerts_home_status ON public.os_network_risk_alerts(home_id, status, severity, created_at DESC);

CREATE OR REPLACE FUNCTION public.os_network_upsert_node(
  p_provider_id int4,
  p_home_id int4,
  p_node_type os_network_node_type,
  p_display_name text,
  p_young_person_id int4 DEFAULT NULL,
  p_staff_id int4 DEFAULT NULL,
  p_external_reference text DEFAULT NULL,
  p_risk_level os_pattern_severity DEFAULT 'moderate',
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_safeguarding_network_nodes (
    provider_id, home_id, node_type, display_name, young_person_id, staff_id,
    external_reference, risk_level, created_by, metadata
  ) VALUES (
    p_provider_id, p_home_id, p_node_type, p_display_name, p_young_person_id, p_staff_id,
    p_external_reference, p_risk_level, p_created_by, coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (home_id, node_type, display_name, young_person_id, staff_id, external_reference) DO UPDATE SET
    risk_level = EXCLUDED.risk_level,
    metadata = public.os_safeguarding_network_nodes.metadata || EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_network_upsert_edge(
  p_provider_id int4,
  p_home_id int4,
  p_source_node_id uuid,
  p_target_node_id uuid,
  p_edge_type os_network_edge_type DEFAULT 'associated_with',
  p_strength numeric DEFAULT 0.5,
  p_risk_level os_pattern_severity DEFAULT 'moderate',
  p_evidence_refs jsonb DEFAULT '[]'::jsonb,
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_safeguarding_network_edges (
    provider_id, home_id, source_node_id, target_node_id, edge_type, strength,
    risk_level, evidence_refs, created_by, metadata
  ) VALUES (
    p_provider_id, p_home_id, p_source_node_id, p_target_node_id, p_edge_type, p_strength,
    p_risk_level, coalesce(p_evidence_refs, '[]'::jsonb), p_created_by, coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (source_node_id, target_node_id, edge_type) DO UPDATE SET
    strength = greatest(public.os_safeguarding_network_edges.strength, EXCLUDED.strength),
    risk_level = EXCLUDED.risk_level,
    evidence_refs = public.os_safeguarding_network_edges.evidence_refs || EXCLUDED.evidence_refs,
    last_seen_at = now(),
    occurrence_count = public.os_safeguarding_network_edges.occurrence_count + 1,
    active = true,
    metadata = public.os_safeguarding_network_edges.metadata || EXCLUDED.metadata
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_network_add_missing_location(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_location_name text,
  p_missing_workflow_id uuid DEFAULT NULL,
  p_risk_level os_pattern_severity DEFAULT 'high',
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_yp_node uuid;
  v_location_node uuid;
  v_edge uuid;
BEGIN
  v_yp_node := public.os_network_upsert_node(
    p_provider_id, p_home_id, 'young_person', 'Young Person ' || p_young_person_id,
    p_young_person_id, NULL, NULL, p_risk_level, p_created_by,
    jsonb_build_object('source','missing_location')
  );

  v_location_node := public.os_network_upsert_node(
    p_provider_id, p_home_id, 'location', p_location_name,
    NULL, NULL, NULL, p_risk_level, p_created_by,
    jsonb_build_object('source','missing_location')
  );

  v_edge := public.os_network_upsert_edge(
    p_provider_id, p_home_id, v_yp_node, v_location_node, 'missing_location', 0.8,
    p_risk_level,
    jsonb_build_array(jsonb_build_object('table','os_missing_from_care_workflows','id',p_missing_workflow_id)),
    p_created_by,
    jsonb_build_object('location_name', p_location_name)
  );

  RETURN v_edge;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_network_detect_shared_risks(
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
  FOR v_record IN
    SELECT
      target_node_id,
      count(DISTINCT source_node_id) AS child_count,
      jsonb_agg(DISTINCT source_node_id) AS child_nodes,
      max(risk_level::text) AS max_risk
    FROM public.os_safeguarding_network_edges e
    JOIN public.os_safeguarding_network_nodes n ON n.id = e.target_node_id
    WHERE e.home_id = p_home_id
      AND e.edge_type IN ('missing_location','risk_location','exploitation_concern')
      AND e.active = true
      AND n.node_type IN ('location','external_person','online_contact','risk_theme')
    GROUP BY target_node_id
    HAVING count(DISTINCT source_node_id) >= 2
  LOOP
    v_command_id := public.os_command_create_manual_item(
      'incident_manager_review',
      p_provider_id,
      p_home_id,
      NULL,
      NULL,
      'Shared safeguarding network risk detected involving multiple young people. Review contextual safeguarding links and consider multi-agency discussion.',
      'os_safeguarding_network_edges',
      NULL,
      now() + interval '24 hours',
      p_created_by,
      jsonb_build_object('target_node_id', v_record.target_node_id, 'child_count', v_record.child_count)
    );

    INSERT INTO public.os_network_risk_alerts (
      provider_id, home_id, alert_type, severity, title, summary, linked_nodes, command_item_id, created_by
    ) VALUES (
      p_provider_id,
      p_home_id,
      'shared_contextual_risk',
      'high',
      'Shared contextual safeguarding risk detected',
      'Two or more young people are linked to the same risk location/contact/theme. This may indicate peer, exploitation or contextual safeguarding risk.',
      jsonb_build_array(v_record.target_node_id) || coalesce(v_record.child_nodes, '[]'::jsonb),
      v_command_id,
      p_created_by
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_safeguarding_network AS
SELECT
  n.id,
  n.provider_id,
  n.home_id,
  n.node_type::text AS node_type,
  n.display_name,
  n.young_person_id,
  n.staff_id,
  n.external_reference,
  n.risk_level::text AS risk_level,
  n.is_sensitive,
  n.metadata,
  n.created_at,
  coalesce(jsonb_agg(jsonb_build_object(
    'edge_id', e.id,
    'edge_type', e.edge_type::text,
    'target_node_id', e.target_node_id,
    'strength', e.strength,
    'risk_level', e.risk_level::text,
    'occurrence_count', e.occurrence_count,
    'last_seen_at', e.last_seen_at
  )) FILTER (WHERE e.id IS NOT NULL), '[]'::jsonb) AS outgoing_edges
FROM public.os_safeguarding_network_nodes n
LEFT JOIN public.os_safeguarding_network_edges e ON e.source_node_id = n.id AND e.active = true
GROUP BY n.id;

CREATE OR REPLACE VIEW public.vw_os_network_risk_alert_board AS
SELECT
  a.id,
  a.provider_id,
  a.home_id,
  a.young_person_id,
  a.alert_type,
  a.severity::text AS severity,
  a.title,
  a.summary,
  a.linked_nodes,
  a.linked_edges,
  a.command_item_id,
  a.status::text AS status,
  a.created_at,
  CASE a.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END AS severity_sort
FROM public.os_network_risk_alerts a
WHERE a.status IN ('new','reviewing')
ORDER BY severity_sort, created_at DESC;
