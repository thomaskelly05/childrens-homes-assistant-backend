-- IndiCare OS Command Centre
-- Additive migration: creates the operating command layer for Ofsted-regulated homes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE os_command_priority AS ENUM ('critical','high','medium','low','info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_command_status AS ENUM ('open','in_progress','waiting','completed','dismissed','void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_command_domain AS ENUM (
    'safeguarding','daily_care','risk','missing_from_care','medication','health','education',
    'family_contact','voice_rights','workforce','rota','handover','home_operations',
    'quality','reg40','reg44','reg45','ofsted','ai_assistant','governance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_command_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  young_person_id int4,
  staff_id int4,
  domain os_command_domain NOT NULL,
  priority os_command_priority NOT NULL DEFAULT 'medium',
  status os_command_status NOT NULL DEFAULT 'open',
  title text NOT NULL,
  summary text,
  recommended_action text,
  source_table text,
  source_id int8,
  due_at timestamptz,
  assigned_to_user_id int4,
  assigned_to_staff_id int4,
  sccif_area text CHECK (sccif_area IS NULL OR sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  regulation_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_generated boolean NOT NULL DEFAULT false,
  ai_output_id int8,
  created_by int4,
  completed_by int4,
  completed_at timestamptz,
  dismissed_by int4,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id, domain, title)
);

CREATE TABLE IF NOT EXISTS public.os_command_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_item_id uuid NOT NULL REFERENCES public.os_command_items(id) ON DELETE CASCADE,
  decision text NOT NULL,
  rationale text,
  decided_by int4,
  decided_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_command_user_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id int4 NOT NULL,
  command_item_id uuid NOT NULL REFERENCES public.os_command_items(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, command_item_id)
);

CREATE INDEX IF NOT EXISTS idx_os_command_items_home_status ON public.os_command_items(home_id, status, priority, due_at);
CREATE INDEX IF NOT EXISTS idx_os_command_items_yp_status ON public.os_command_items(young_person_id, status, priority, due_at);
CREATE INDEX IF NOT EXISTS idx_os_command_items_domain ON public.os_command_items(domain, status);
CREATE INDEX IF NOT EXISTS idx_os_command_items_source ON public.os_command_items(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_os_command_decisions_item ON public.os_command_decisions(command_item_id, decided_at DESC);

CREATE OR REPLACE FUNCTION public.touch_os_command_item_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;
  IF NEW.status = 'dismissed' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.dismissed_at IS NULL THEN
    NEW.dismissed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_os_command_items ON public.os_command_items;
CREATE TRIGGER trg_touch_os_command_items
BEFORE UPDATE ON public.os_command_items
FOR EACH ROW EXECUTE FUNCTION public.touch_os_command_item_updated_at();

-- Live operational feed. Uses dynamic SQL so the migration still succeeds if optional source tables are not present yet.
CREATE OR REPLACE FUNCTION public.os_command_live_feed(
  p_home_id int4 DEFAULT NULL,
  p_young_person_id int4 DEFAULT NULL,
  p_domain text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_limit int4 DEFAULT 100
)
RETURNS TABLE (
  feed_id text,
  command_item_id uuid,
  provider_id int4,
  home_id int4,
  young_person_id int4,
  staff_id int4,
  domain text,
  priority text,
  status text,
  title text,
  summary text,
  recommended_action text,
  source_table text,
  source_id int8,
  due_at timestamptz,
  sccif_area text,
  regulation_refs text[],
  evidence_refs jsonb,
  ai_generated boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'command:' || i.id::text,
    i.id,
    i.provider_id,
    i.home_id,
    i.young_person_id,
    i.staff_id,
    i.domain::text,
    i.priority::text,
    i.status::text,
    i.title,
    i.summary,
    i.recommended_action,
    i.source_table,
    i.source_id,
    i.due_at,
    i.sccif_area,
    i.regulation_refs,
    i.evidence_refs,
    i.ai_generated,
    i.created_at,
    i.updated_at
  FROM public.os_command_items i
  WHERE i.status IN ('open','in_progress','waiting')
    AND (p_home_id IS NULL OR i.home_id = p_home_id)
    AND (p_young_person_id IS NULL OR i.young_person_id = p_young_person_id)
    AND (p_domain IS NULL OR i.domain::text = p_domain)
    AND (p_priority IS NULL OR i.priority::text = p_priority)

  UNION ALL

  SELECT
    'incident:' || inc.id::text,
    NULL::uuid,
    inc.provider_id,
    inc.home_id,
    inc.young_person_id,
    NULL::int4,
    'safeguarding',
    CASE WHEN lower(coalesce(inc.severity::text,'')) IN ('critical','serious','high') THEN 'critical' ELSE 'high' END,
    'open',
    'Incident requires manager review',
    coalesce(inc.summary, inc.description, 'Incident requires review'),
    'Review incident, consider Regulation 40 notification, update risk assessment and record management oversight.',
    'incidents',
    inc.id::int8,
    coalesce(inc.created_at, now()) + interval '24 hours',
    'helped_and_protected',
    ARRAY['Regulation 40','SCCIF helped and protected'],
    jsonb_build_array(jsonb_build_object('table','incidents','id',inc.id)),
    false,
    coalesce(inc.created_at, now()),
    coalesce(inc.updated_at, inc.created_at, now())
  FROM public.incidents inc
  WHERE to_regclass('public.incidents') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.os_command_items x WHERE x.source_table='incidents' AND x.source_id=inc.id)
    AND (p_home_id IS NULL OR inc.home_id = p_home_id)
    AND (p_young_person_id IS NULL OR inc.young_person_id = p_young_person_id)
    AND (p_domain IS NULL OR p_domain = 'safeguarding')
    AND (p_priority IS NULL OR p_priority IN ('critical','high'))

  ORDER BY
    CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
    due_at NULLS LAST,
    created_at DESC
  LIMIT greatest(coalesce(p_limit, 100), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.os_command_capture_feed_item(p_feed_id text, p_user_id int4 DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_item record;
  v_id uuid;
BEGIN
  SELECT * INTO v_item FROM public.os_command_live_feed(NULL, NULL, NULL, NULL, 500) WHERE feed_id = p_feed_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feed item not found: %', p_feed_id;
  END IF;
  IF v_item.command_item_id IS NOT NULL THEN
    RETURN v_item.command_item_id;
  END IF;
  INSERT INTO public.os_command_items (
    provider_id, home_id, young_person_id, staff_id, domain, priority, status, title, summary,
    recommended_action, source_table, source_id, due_at, sccif_area, regulation_refs, evidence_refs,
    ai_generated, created_by
  ) VALUES (
    v_item.provider_id, v_item.home_id, v_item.young_person_id, v_item.staff_id,
    v_item.domain::os_command_domain, v_item.priority::os_command_priority, 'open', v_item.title,
    v_item.summary, v_item.recommended_action, v_item.source_table, v_item.source_id, v_item.due_at,
    v_item.sccif_area, v_item.regulation_refs, v_item.evidence_refs, v_item.ai_generated, p_user_id
  )
  ON CONFLICT (source_table, source_id, domain, title) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_command_summary AS
SELECT
  provider_id,
  home_id,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting')) AS open_total,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND priority='critical') AS critical_count,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND priority='high') AS high_count,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND due_at < now()) AS overdue_count,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND domain='safeguarding') AS safeguarding_count,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND domain='reg40') AS reg40_count,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND domain='risk') AS risk_count,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND domain IN ('quality','reg44','reg45','ofsted')) AS quality_count
FROM public.os_command_items
GROUP BY provider_id, home_id;
