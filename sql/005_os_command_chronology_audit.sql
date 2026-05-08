-- IndiCare OS Command chronology and audit layer
-- Adds the evidence spine that links operational command items to chronology, audit and inspection evidence.

CREATE TABLE IF NOT EXISTS public.os_chronology_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  young_person_id int4,
  staff_id int4,
  event_type text NOT NULL,
  event_title text NOT NULL,
  event_summary text,
  event_at timestamptz NOT NULL DEFAULT now(),
  source_table text,
  source_id int8,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  sccif_area text CHECK (sccif_area IS NULL OR sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  regulation_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'manager' CHECK (visibility IN ('staff','senior','manager','inspector','restricted')),
  is_sensitive boolean NOT NULL DEFAULT false,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_table, source_id, event_type)
);

CREATE TABLE IF NOT EXISTS public.os_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  actor_user_id int4,
  actor_staff_id int4,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  young_person_id int4,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE CASCADE,
  chronology_event_id uuid REFERENCES public.os_chronology_events(id) ON DELETE CASCADE,
  evidence_type text NOT NULL DEFAULT 'record',
  source_table text NOT NULL,
  source_id int8 NOT NULL,
  label text,
  sccif_area text CHECK (sccif_area IS NULL OR sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  regulation_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  added_by int4,
  added_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (command_item_id, source_table, source_id, evidence_type)
);

CREATE INDEX IF NOT EXISTS idx_os_chronology_home_yp_event_at ON public.os_chronology_events(home_id, young_person_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_chronology_source ON public.os_chronology_events(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_os_chronology_command ON public.os_chronology_events(command_item_id);
CREATE INDEX IF NOT EXISTS idx_os_audit_entity ON public.os_audit_events(entity_table, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_audit_home_action ON public.os_audit_events(home_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_evidence_links_command ON public.os_evidence_links(command_item_id);
CREATE INDEX IF NOT EXISTS idx_os_evidence_links_chronology ON public.os_evidence_links(chronology_event_id);

CREATE OR REPLACE FUNCTION public.os_audit_log(
  p_action text,
  p_entity_table text,
  p_entity_id text,
  p_provider_id int4 DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_actor_user_id int4 DEFAULT NULL,
  p_actor_staff_id int4 DEFAULT NULL,
  p_previous_state jsonb DEFAULT NULL,
  p_new_state jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_audit_events (
    provider_id, home_id, actor_user_id, actor_staff_id, action, entity_table, entity_id,
    previous_state, new_state, reason, metadata
  ) VALUES (
    p_provider_id, p_home_id, p_actor_user_id, p_actor_staff_id, p_action, p_entity_table, p_entity_id,
    p_previous_state, p_new_state, p_reason, coalesce(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_chronology_add_event(
  p_event_type text,
  p_event_title text,
  p_event_summary text DEFAULT NULL,
  p_provider_id int4 DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_young_person_id int4 DEFAULT NULL,
  p_staff_id int4 DEFAULT NULL,
  p_event_at timestamptz DEFAULT now(),
  p_source_table text DEFAULT NULL,
  p_source_id int8 DEFAULT NULL,
  p_command_item_id uuid DEFAULT NULL,
  p_sccif_area text DEFAULT NULL,
  p_regulation_refs text[] DEFAULT ARRAY[]::text[],
  p_evidence_refs jsonb DEFAULT '[]'::jsonb,
  p_visibility text DEFAULT 'manager',
  p_is_sensitive boolean DEFAULT false,
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_chronology_events (
    provider_id, home_id, young_person_id, staff_id, event_type, event_title, event_summary,
    event_at, source_table, source_id, command_item_id, sccif_area, regulation_refs, evidence_refs,
    visibility, is_sensitive, created_by, metadata
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_staff_id, p_event_type, p_event_title, p_event_summary,
    coalesce(p_event_at, now()), p_source_table, p_source_id, p_command_item_id, p_sccif_area,
    coalesce(p_regulation_refs, ARRAY[]::text[]), coalesce(p_evidence_refs, '[]'::jsonb),
    coalesce(p_visibility, 'manager'), coalesce(p_is_sensitive, false), p_created_by,
    coalesce(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (source_table, source_id, event_type) DO UPDATE SET
    event_title = EXCLUDED.event_title,
    event_summary = EXCLUDED.event_summary,
    command_item_id = coalesce(EXCLUDED.command_item_id, public.os_chronology_events.command_item_id),
    evidence_refs = EXCLUDED.evidence_refs
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_command_complete_with_chronology(
  p_command_item_id uuid,
  p_user_id int4 DEFAULT NULL,
  p_decision text DEFAULT NULL,
  p_rationale text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_item public.os_command_items%ROWTYPE;
  v_event_id uuid;
BEGIN
  SELECT * INTO v_item FROM public.os_command_items WHERE id = p_command_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Command item not found: %', p_command_item_id;
  END IF;

  UPDATE public.os_command_items
  SET status = 'completed', completed_by = p_user_id, completed_at = now()
  WHERE id = p_command_item_id;

  IF p_decision IS NOT NULL THEN
    INSERT INTO public.os_command_decisions (command_item_id, decision, rationale, decided_by)
    VALUES (p_command_item_id, p_decision, p_rationale, p_user_id);
  END IF;

  v_event_id := public.os_chronology_add_event(
    'os_command_completed',
    'OS Command completed: ' || v_item.title,
    coalesce(p_decision, v_item.summary),
    v_item.provider_id,
    v_item.home_id,
    v_item.young_person_id,
    v_item.staff_id,
    now(),
    'os_command_items',
    NULL,
    p_command_item_id,
    v_item.sccif_area,
    v_item.regulation_refs,
    v_item.evidence_refs,
    'manager',
    false,
    p_user_id,
    jsonb_build_object('completed_command_item_id', p_command_item_id)
  );

  PERFORM public.os_audit_log(
    'os_command.completed',
    'os_command_items',
    p_command_item_id::text,
    v_item.provider_id,
    v_item.home_id,
    p_user_id,
    NULL,
    to_jsonb(v_item),
    jsonb_build_object('status','completed','completed_by',p_user_id),
    p_rationale,
    jsonb_build_object('chronology_event_id', v_event_id)
  );

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_command_evidence_pack AS
SELECT
  i.id AS command_item_id,
  i.provider_id,
  i.home_id,
  i.young_person_id,
  i.domain::text AS domain,
  i.priority::text AS priority,
  i.status::text AS status,
  i.title,
  i.summary,
  i.recommended_action,
  i.sccif_area,
  i.regulation_refs,
  i.source_table,
  i.source_id,
  i.created_at,
  i.completed_at,
  coalesce(jsonb_agg(DISTINCT jsonb_build_object(
    'chronology_event_id', c.id,
    'event_type', c.event_type,
    'event_title', c.event_title,
    'event_at', c.event_at
  )) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb) AS chronology,
  coalesce(jsonb_agg(DISTINCT jsonb_build_object(
    'evidence_link_id', e.id,
    'evidence_type', e.evidence_type,
    'source_table', e.source_table,
    'source_id', e.source_id,
    'label', e.label
  )) FILTER (WHERE e.id IS NOT NULL), '[]'::jsonb) AS evidence_links
FROM public.os_command_items i
LEFT JOIN public.os_chronology_events c ON c.command_item_id = i.id
LEFT JOIN public.os_evidence_links e ON e.command_item_id = i.id
GROUP BY i.id;
