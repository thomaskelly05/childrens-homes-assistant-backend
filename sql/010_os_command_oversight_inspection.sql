-- IndiCare OS Command provider oversight and inspection evidence layer
-- Adds cross-home leadership dashboards and Ofsted/SCCIF evidence pack foundations.

CREATE TABLE IF NOT EXISTS public.os_inspection_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  export_type text NOT NULL DEFAULT 'sccif_evidence_pack',
  title text NOT NULL,
  date_from date,
  date_to date,
  sccif_area text CHECK (sccif_area IS NULL OR sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  requested_by int4,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','failed','archived')),
  file_url text,
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_inspection_evidence_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  chronology_event_id uuid REFERENCES public.os_chronology_events(id) ON DELETE SET NULL,
  sccif_area text NOT NULL CHECK (sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  evidence_title text NOT NULL,
  evidence_summary text NOT NULL,
  strength text CHECK (strength IS NULL OR strength IN ('strong','adequate','weak','gap')),
  management_commentary text,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_inspection_exports_home_status ON public.os_inspection_exports(home_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_inspection_notes_home_area ON public.os_inspection_evidence_notes(home_id, sccif_area, created_at DESC);

CREATE OR REPLACE VIEW public.vw_os_provider_oversight AS
SELECT
  i.provider_id,
  i.home_id,
  count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting')) AS open_commands,
  count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting') AND i.priority='critical') AS critical_commands,
  count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting') AND i.priority='high') AS high_commands,
  count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting') AND i.due_at < now()) AS overdue_commands,
  count(*) FILTER (WHERE i.domain IN ('safeguarding','missing_from_care','reg40') AND i.status IN ('open','in_progress','waiting')) AS safeguarding_pressure,
  count(*) FILTER (WHERE i.domain IN ('quality','reg44','reg45','ofsted') AND i.status IN ('open','in_progress','waiting')) AS quality_pressure,
  count(*) FILTER (WHERE i.ai_generated = true AND i.status IN ('open','in_progress','waiting')) AS ai_generated_open,
  max(i.created_at) AS latest_command_at,
  CASE
    WHEN count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting') AND i.priority='critical') > 0 THEN 'critical'
    WHEN count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting') AND i.due_at < now()) > 3 THEN 'high'
    WHEN count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting') AND i.priority='high') > 5 THEN 'high'
    WHEN count(*) FILTER (WHERE i.status IN ('open','in_progress','waiting')) > 0 THEN 'monitor'
    ELSE 'stable'
  END AS oversight_state
FROM public.os_command_items i
GROUP BY i.provider_id, i.home_id;

CREATE OR REPLACE VIEW public.vw_os_sccif_evidence_summary AS
SELECT
  home_id,
  sccif_area,
  count(*) AS evidence_items,
  count(*) FILTER (WHERE strength='strong') AS strong_count,
  count(*) FILTER (WHERE strength='adequate') AS adequate_count,
  count(*) FILTER (WHERE strength='weak') AS weak_count,
  count(*) FILTER (WHERE strength='gap') AS gap_count,
  max(created_at) AS latest_evidence_at
FROM public.os_inspection_evidence_notes
GROUP BY home_id, sccif_area;

CREATE OR REPLACE VIEW public.vw_os_inspection_readiness AS
WITH command_pressure AS (
  SELECT
    home_id,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND priority='critical') AS critical_open,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND priority='high') AS high_open,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND due_at < now()) AS overdue_open,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND sccif_area='children_experiences_progress') AS cep_open,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND sccif_area='helped_and_protected') AS hp_open,
    count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND sccif_area='leadership_management') AS lm_open
  FROM public.os_command_items
  GROUP BY home_id
), evidence AS (
  SELECT
    home_id,
    count(*) FILTER (WHERE strength='strong') AS strong_evidence,
    count(*) FILTER (WHERE strength='gap') AS evidence_gaps,
    count(*) FILTER (WHERE sccif_area='children_experiences_progress') AS cep_evidence,
    count(*) FILTER (WHERE sccif_area='helped_and_protected') AS hp_evidence,
    count(*) FILTER (WHERE sccif_area='leadership_management') AS lm_evidence
  FROM public.os_inspection_evidence_notes
  GROUP BY home_id
), missing AS (
  SELECT
    home_id,
    count(*) FILTER (WHERE status IN ('open','located')) AS active_missing,
    count(*) FILTER (WHERE board_state IN ('return_home_interview_overdue','risk_review_overdue')) AS missing_followup_overdue
  FROM public.vw_os_missing_from_care_board
  GROUP BY home_id
), reg40 AS (
  SELECT
    home_id,
    count(*) FILTER (WHERE board_state='overdue') AS reg40_overdue,
    count(*) FILTER (WHERE board_state='required') AS reg40_required
  FROM public.vw_os_reg40_board
  GROUP BY home_id
)
SELECT
  coalesce(c.home_id, e.home_id, m.home_id, r.home_id) AS home_id,
  coalesce(c.critical_open, 0) AS critical_open,
  coalesce(c.high_open, 0) AS high_open,
  coalesce(c.overdue_open, 0) AS overdue_open,
  coalesce(m.active_missing, 0) AS active_missing,
  coalesce(m.missing_followup_overdue, 0) AS missing_followup_overdue,
  coalesce(r.reg40_overdue, 0) AS reg40_overdue,
  coalesce(r.reg40_required, 0) AS reg40_required,
  coalesce(e.strong_evidence, 0) AS strong_evidence,
  coalesce(e.evidence_gaps, 0) AS evidence_gaps,
  coalesce(c.cep_open, 0) AS children_experiences_progress_open,
  coalesce(c.hp_open, 0) AS helped_and_protected_open,
  coalesce(c.lm_open, 0) AS leadership_management_open,
  coalesce(e.cep_evidence, 0) AS children_experiences_progress_evidence,
  coalesce(e.hp_evidence, 0) AS helped_and_protected_evidence,
  coalesce(e.lm_evidence, 0) AS leadership_management_evidence,
  CASE
    WHEN coalesce(c.critical_open, 0) > 0 OR coalesce(m.active_missing, 0) > 0 OR coalesce(r.reg40_overdue, 0) > 0 THEN 'urgent'
    WHEN coalesce(c.overdue_open, 0) > 5 OR coalesce(e.evidence_gaps, 0) > 3 THEN 'requires_attention'
    WHEN coalesce(c.high_open, 0) > 0 THEN 'monitor'
    ELSE 'inspection_ready'
  END AS readiness_state
FROM command_pressure c
FULL OUTER JOIN evidence e ON e.home_id = c.home_id
FULL OUTER JOIN missing m ON m.home_id = coalesce(c.home_id, e.home_id)
FULL OUTER JOIN reg40 r ON r.home_id = coalesce(c.home_id, e.home_id, m.home_id);

CREATE OR REPLACE FUNCTION public.os_inspection_create_evidence_note(
  p_provider_id int4,
  p_home_id int4,
  p_sccif_area text,
  p_evidence_title text,
  p_evidence_summary text,
  p_strength text DEFAULT 'adequate',
  p_young_person_id int4 DEFAULT NULL,
  p_command_item_id uuid DEFAULT NULL,
  p_chronology_event_id uuid DEFAULT NULL,
  p_management_commentary text DEFAULT NULL,
  p_source_refs jsonb DEFAULT '[]'::jsonb,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_inspection_evidence_notes (
    provider_id, home_id, young_person_id, command_item_id, chronology_event_id, sccif_area,
    evidence_title, evidence_summary, strength, management_commentary, source_refs, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_command_item_id, p_chronology_event_id, p_sccif_area,
    p_evidence_title, p_evidence_summary, p_strength, p_management_commentary, coalesce(p_source_refs, '[]'::jsonb), p_created_by
  ) RETURNING id INTO v_id;

  PERFORM public.os_live_emit(
    'chronology.created',
    'os_inspection_evidence_notes',
    v_id::text,
    p_evidence_title,
    p_provider_id,
    p_home_id,
    p_young_person_id,
    NULL,
    jsonb_build_object('sccif_area', p_sccif_area, 'strength', p_strength),
    ARRAY['manager','responsible_individual','inspector'],
    p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_inspection_start_export(
  p_provider_id int4,
  p_home_id int4,
  p_title text,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_sccif_area text DEFAULT NULL,
  p_requested_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_snapshot jsonb;
  v_id uuid;
BEGIN
  SELECT jsonb_build_object(
    'readiness', (SELECT to_jsonb(r) FROM public.vw_os_inspection_readiness r WHERE r.home_id = p_home_id LIMIT 1),
    'evidence_summary', (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.vw_os_sccif_evidence_summary s WHERE s.home_id = p_home_id),
    'open_commands', (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.os_command_live_feed(p_home_id, NULL, NULL, NULL, 250) c),
    'reg40', (SELECT coalesce(jsonb_agg(to_jsonb(r40)), '[]'::jsonb) FROM public.vw_os_reg40_board r40 WHERE r40.home_id = p_home_id),
    'missing', (SELECT coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) FROM public.vw_os_missing_from_care_board m WHERE m.home_id = p_home_id)
  ) INTO v_snapshot;

  INSERT INTO public.os_inspection_exports (
    provider_id, home_id, title, date_from, date_to, sccif_area, requested_by,
    status, evidence_snapshot, generated_at
  ) VALUES (
    p_provider_id, p_home_id, p_title, p_date_from, p_date_to, p_sccif_area, p_requested_by,
    'ready', coalesce(v_snapshot, '{}'::jsonb), now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
