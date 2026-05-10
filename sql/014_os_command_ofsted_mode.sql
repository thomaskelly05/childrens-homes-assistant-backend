-- IndiCare OS Ofsted inspection mode
-- Adds inspection workspaces, secure inspector access windows and SCCIF evidence bundles.

DO $$ BEGIN
  CREATE TYPE os_inspection_mode_status AS ENUM ('draft','active','locked','closed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_inspection_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  title text NOT NULL,
  status os_inspection_mode_status NOT NULL DEFAULT 'draft',
  inspection_type text NOT NULL DEFAULT 'ofsted',
  date_from date,
  date_to date,
  lead_manager_user_id int4,
  responsible_individual_user_id int4,
  inspector_access_starts_at timestamptz,
  inspector_access_ends_at timestamptz,
  locked_at timestamptz,
  closed_at timestamptz,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_inspection_workspace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.os_inspection_workspaces(id) ON DELETE CASCADE,
  provider_id int4,
  home_id int4 NOT NULL,
  sccif_area text NOT NULL CHECK (sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  item_type text NOT NULL DEFAULT 'evidence',
  title text NOT NULL,
  summary text,
  source_table text,
  source_id text,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  chronology_event_id uuid REFERENCES public.os_chronology_events(id) ON DELETE SET NULL,
  strength text CHECK (strength IS NULL OR strength IN ('strong','adequate','weak','gap')),
  manager_commentary text,
  inspector_visible boolean NOT NULL DEFAULT false,
  sort_order int4 NOT NULL DEFAULT 0,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_inspection_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.os_inspection_workspaces(id) ON DELETE CASCADE,
  provider_id int4,
  home_id int4,
  user_id int4,
  action text NOT NULL,
  entity_table text,
  entity_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_inspection_workspaces_home_status ON public.os_inspection_workspaces(home_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_inspection_workspace_items_workspace ON public.os_inspection_workspace_items(workspace_id, sccif_area, sort_order);
CREATE INDEX IF NOT EXISTS idx_os_inspection_access_log_workspace ON public.os_inspection_access_log(workspace_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.os_inspection_create_workspace(
  p_provider_id int4,
  p_home_id int4,
  p_title text,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_inspection_workspaces (
    provider_id, home_id, title, date_from, date_to, lead_manager_user_id, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_title, p_date_from, p_date_to, p_created_by, p_created_by
  ) RETURNING id INTO v_id;

  INSERT INTO public.os_inspection_workspace_items (
    workspace_id, provider_id, home_id, sccif_area, item_type, title, summary, source_table, source_id,
    command_item_id, strength, manager_commentary, inspector_visible, created_by
  )
  SELECT
    v_id,
    n.provider_id,
    n.home_id,
    n.sccif_area,
    'evidence_note',
    n.evidence_title,
    n.evidence_summary,
    'os_inspection_evidence_notes',
    n.id::text,
    n.command_item_id,
    n.strength,
    n.management_commentary,
    CASE WHEN n.strength IN ('strong','adequate') THEN true ELSE false END,
    p_created_by
  FROM public.os_inspection_evidence_notes n
  WHERE n.home_id = p_home_id
    AND (p_date_from IS NULL OR n.created_at::date >= p_date_from)
    AND (p_date_to IS NULL OR n.created_at::date <= p_date_to);

  INSERT INTO public.os_inspection_workspace_items (
    workspace_id, provider_id, home_id, sccif_area, item_type, title, summary, source_table, source_id,
    command_item_id, chronology_event_id, strength, manager_commentary, inspector_visible, created_by
  )
  SELECT
    v_id,
    c.provider_id,
    c.home_id,
    coalesce(c.sccif_area, 'leadership_management'),
    'chronology',
    c.event_title,
    c.event_summary,
    'os_chronology_events',
    c.id::text,
    c.command_item_id,
    c.id,
    'adequate',
    'Chronology event included for inspection context.',
    CASE WHEN c.visibility IN ('manager','inspector') AND c.is_sensitive = false THEN true ELSE false END,
    p_created_by
  FROM public.os_chronology_events c
  WHERE c.home_id = p_home_id
    AND c.sccif_area IS NOT NULL
    AND (p_date_from IS NULL OR c.event_at::date >= p_date_from)
    AND (p_date_to IS NULL OR c.event_at::date <= p_date_to);

  PERFORM public.os_live_emit(
    'chronology.created', 'os_inspection_workspaces', v_id::text, 'Inspection workspace created',
    p_provider_id, p_home_id, NULL, NULL,
    jsonb_build_object('title', p_title),
    ARRAY['manager','responsible_individual'],
    p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_inspection_activate_workspace(
  p_workspace_id uuid,
  p_access_starts_at timestamptz DEFAULT now(),
  p_access_ends_at timestamptz DEFAULT NULL,
  p_user_id int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_workspace public.os_inspection_workspaces%ROWTYPE;
BEGIN
  SELECT * INTO v_workspace FROM public.os_inspection_workspaces WHERE id = p_workspace_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inspection workspace not found: %', p_workspace_id;
  END IF;

  UPDATE public.os_inspection_workspaces
  SET status = 'active',
      inspector_access_starts_at = coalesce(p_access_starts_at, now()),
      inspector_access_ends_at = p_access_ends_at,
      updated_at = now()
  WHERE id = p_workspace_id;

  INSERT INTO public.os_inspection_access_log (
    workspace_id, provider_id, home_id, user_id, action, entity_table, entity_id
  ) VALUES (
    p_workspace_id, v_workspace.provider_id, v_workspace.home_id, p_user_id,
    'workspace.activated', 'os_inspection_workspaces', p_workspace_id::text
  );

  RETURN p_workspace_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_inspection_workspace_summary AS
SELECT
  w.id,
  w.provider_id,
  w.home_id,
  w.title,
  w.status::text AS status,
  w.inspection_type,
  w.date_from,
  w.date_to,
  w.inspector_access_starts_at,
  w.inspector_access_ends_at,
  count(i.id) AS total_items,
  count(i.id) FILTER (WHERE i.inspector_visible = true) AS inspector_visible_items,
  count(i.id) FILTER (WHERE i.sccif_area='children_experiences_progress') AS cep_items,
  count(i.id) FILTER (WHERE i.sccif_area='helped_and_protected') AS hp_items,
  count(i.id) FILTER (WHERE i.sccif_area='leadership_management') AS lm_items,
  count(i.id) FILTER (WHERE i.strength='gap') AS evidence_gaps,
  w.created_at,
  w.updated_at
FROM public.os_inspection_workspaces w
LEFT JOIN public.os_inspection_workspace_items i ON i.workspace_id = w.id
GROUP BY w.id;

CREATE OR REPLACE VIEW public.vw_os_inspection_workspace_items AS
SELECT
  i.id,
  i.workspace_id,
  i.provider_id,
  i.home_id,
  i.sccif_area,
  i.item_type,
  i.title,
  i.summary,
  i.source_table,
  i.source_id,
  i.command_item_id,
  i.chronology_event_id,
  i.strength,
  i.manager_commentary,
  i.inspector_visible,
  i.sort_order,
  i.created_at
FROM public.os_inspection_workspace_items i
ORDER BY i.sccif_area, i.sort_order, i.created_at DESC;
