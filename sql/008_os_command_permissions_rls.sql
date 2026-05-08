-- IndiCare OS Command permissions and RLS foundation
-- Adds home/role-scoped access controls for command, chronology, evidence and audit records.

DO $$ BEGIN
  CREATE TYPE os_access_level AS ENUM ('none','read','write','approve','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL,
  domain os_command_domain NOT NULL,
  access_level os_access_level NOT NULL DEFAULT 'read',
  can_view_sensitive boolean NOT NULL DEFAULT false,
  can_complete_commands boolean NOT NULL DEFAULT false,
  can_create_reg40 boolean NOT NULL DEFAULT false,
  can_approve_ai boolean NOT NULL DEFAULT false,
  can_export_evidence boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_key, domain)
);

CREATE TABLE IF NOT EXISTS public.os_user_home_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id int4 NOT NULL,
  provider_id int4,
  home_id int4 NOT NULL,
  role_key text NOT NULL DEFAULT 'staff',
  access_level os_access_level NOT NULL DEFAULT 'read',
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, home_id, role_key)
);

CREATE TABLE IF NOT EXISTS public.os_user_child_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id int4 NOT NULL,
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  role_key text NOT NULL DEFAULT 'staff',
  access_level os_access_level NOT NULL DEFAULT 'read',
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, young_person_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_os_user_home_access_user_home ON public.os_user_home_access(user_id, home_id, active);
CREATE INDEX IF NOT EXISTS idx_os_user_child_access_user_child ON public.os_user_child_access(user_id, young_person_id, active);
CREATE INDEX IF NOT EXISTS idx_os_role_permissions_role_domain ON public.os_role_permissions(role_key, domain);

INSERT INTO public.os_role_permissions (
  role_key, domain, access_level, can_view_sensitive, can_complete_commands, can_create_reg40, can_approve_ai, can_export_evidence
) VALUES
  ('support_worker','daily_care','write',false,false,false,false,false),
  ('support_worker','handover','write',false,false,false,false,false),
  ('support_worker','safeguarding','read',false,false,false,false,false),
  ('senior','daily_care','approve',true,true,false,false,false),
  ('senior','safeguarding','approve',true,true,true,false,false),
  ('senior','missing_from_care','approve',true,true,true,false,false),
  ('senior','medication','approve',true,true,false,false,false),
  ('manager','safeguarding','admin',true,true,true,true,true),
  ('manager','missing_from_care','admin',true,true,true,true,true),
  ('manager','risk','admin',true,true,true,true,true),
  ('manager','medication','admin',true,true,false,true,true),
  ('manager','quality','admin',true,true,true,true,true),
  ('manager','reg40','admin',true,true,true,true,true),
  ('manager','reg44','admin',true,true,false,true,true),
  ('manager','reg45','admin',true,true,false,true,true),
  ('responsible_individual','quality','admin',true,true,true,true,true),
  ('responsible_individual','ofsted','admin',true,true,true,true,true),
  ('inspector','ofsted','read',true,false,false,false,true)
ON CONFLICT (role_key, domain) DO UPDATE SET
  access_level = EXCLUDED.access_level,
  can_view_sensitive = EXCLUDED.can_view_sensitive,
  can_complete_commands = EXCLUDED.can_complete_commands,
  can_create_reg40 = EXCLUDED.can_create_reg40,
  can_approve_ai = EXCLUDED.can_approve_ai,
  can_export_evidence = EXCLUDED.can_export_evidence,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.os_current_user_id()
RETURNS int4
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::int4;
$$;

CREATE OR REPLACE FUNCTION public.os_user_has_home_access(p_home_id int4, p_min_level os_access_level DEFAULT 'read')
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_id int4 := public.os_current_user_id();
  v_allowed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.os_user_home_access a
    WHERE a.user_id = v_user_id
      AND a.home_id = p_home_id
      AND a.active = true
      AND (a.ends_at IS NULL OR a.ends_at > now())
      AND (
        a.access_level = 'admin'
        OR (p_min_level IN ('read') AND a.access_level IN ('read','write','approve','admin'))
        OR (p_min_level IN ('write') AND a.access_level IN ('write','approve','admin'))
        OR (p_min_level IN ('approve') AND a.access_level IN ('approve','admin'))
      )
  ) INTO v_allowed;

  RETURN coalesce(v_allowed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.os_user_has_child_access(p_home_id int4, p_young_person_id int4, p_min_level os_access_level DEFAULT 'read')
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_id int4 := public.os_current_user_id();
BEGIN
  IF p_young_person_id IS NULL THEN
    RETURN public.os_user_has_home_access(p_home_id, p_min_level);
  END IF;

  RETURN public.os_user_has_home_access(p_home_id, p_min_level)
    OR EXISTS (
      SELECT 1
      FROM public.os_user_child_access a
      WHERE a.user_id = v_user_id
        AND a.home_id = p_home_id
        AND a.young_person_id = p_young_person_id
        AND a.active = true
        AND (a.ends_at IS NULL OR a.ends_at > now())
        AND (
          a.access_level = 'admin'
          OR (p_min_level IN ('read') AND a.access_level IN ('read','write','approve','admin'))
          OR (p_min_level IN ('write') AND a.access_level IN ('write','approve','admin'))
          OR (p_min_level IN ('approve') AND a.access_level IN ('approve','admin'))
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.os_user_can_complete_command(p_command_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_id int4 := public.os_current_user_id();
  v_item public.os_command_items%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_item FROM public.os_command_items WHERE id = p_command_item_id;
  IF NOT FOUND THEN RETURN false; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.os_user_home_access a
    JOIN public.os_role_permissions p
      ON p.role_key = a.role_key
     AND p.domain = v_item.domain
    WHERE a.user_id = v_user_id
      AND a.home_id = v_item.home_id
      AND a.active = true
      AND p.can_complete_commands = true
  );
END;
$$;

ALTER TABLE public.os_command_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_command_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_command_user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_chronology_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_reg40_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_missing_from_care_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_medication_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_daily_record_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_workforce_compliance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_command_items_home_read ON public.os_command_items;
CREATE POLICY os_command_items_home_read ON public.os_command_items
FOR SELECT USING (public.os_user_has_child_access(home_id, young_person_id, 'read'));

DROP POLICY IF EXISTS os_command_items_home_write ON public.os_command_items;
CREATE POLICY os_command_items_home_write ON public.os_command_items
FOR INSERT WITH CHECK (public.os_user_has_child_access(home_id, young_person_id, 'write'));

DROP POLICY IF EXISTS os_command_items_home_update ON public.os_command_items;
CREATE POLICY os_command_items_home_update ON public.os_command_items
FOR UPDATE USING (public.os_user_has_child_access(home_id, young_person_id, 'write'))
WITH CHECK (public.os_user_has_child_access(home_id, young_person_id, 'write'));

DROP POLICY IF EXISTS os_chronology_home_read ON public.os_chronology_events;
CREATE POLICY os_chronology_home_read ON public.os_chronology_events
FOR SELECT USING (public.os_user_has_child_access(home_id, young_person_id, 'read'));

DROP POLICY IF EXISTS os_evidence_home_read ON public.os_evidence_links;
CREATE POLICY os_evidence_home_read ON public.os_evidence_links
FOR SELECT USING (public.os_user_has_child_access(home_id, young_person_id, 'read'));

DROP POLICY IF EXISTS os_reg40_home_read ON public.os_reg40_notifications;
CREATE POLICY os_reg40_home_read ON public.os_reg40_notifications
FOR SELECT USING (public.os_user_has_child_access(home_id, young_person_id, 'read'));

DROP POLICY IF EXISTS os_missing_home_read ON public.os_missing_from_care_workflows;
CREATE POLICY os_missing_home_read ON public.os_missing_from_care_workflows
FOR SELECT USING (public.os_user_has_child_access(home_id, young_person_id, 'read'));

DROP POLICY IF EXISTS os_medication_home_read ON public.os_medication_escalations;
CREATE POLICY os_medication_home_read ON public.os_medication_escalations
FOR SELECT USING (public.os_user_has_child_access(home_id, young_person_id, 'read'));

DROP POLICY IF EXISTS os_daily_gaps_home_read ON public.os_daily_record_gaps;
CREATE POLICY os_daily_gaps_home_read ON public.os_daily_record_gaps
FOR SELECT USING (public.os_user_has_child_access(home_id, young_person_id, 'read'));

DROP POLICY IF EXISTS os_workforce_home_read ON public.os_workforce_compliance;
CREATE POLICY os_workforce_home_read ON public.os_workforce_compliance
FOR SELECT USING (public.os_user_has_home_access(home_id, 'read'));

DROP POLICY IF EXISTS os_command_decisions_read ON public.os_command_decisions;
CREATE POLICY os_command_decisions_read ON public.os_command_decisions
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.os_command_items i
  WHERE i.id = command_item_id
    AND public.os_user_has_child_access(i.home_id, i.young_person_id, 'read')
));

DROP POLICY IF EXISTS os_command_decisions_write ON public.os_command_decisions;
CREATE POLICY os_command_decisions_write ON public.os_command_decisions
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.os_command_items i
  WHERE i.id = command_item_id
    AND public.os_user_has_child_access(i.home_id, i.young_person_id, 'approve')
));

DROP POLICY IF EXISTS os_command_user_pins_self ON public.os_command_user_pins;
CREATE POLICY os_command_user_pins_self ON public.os_command_user_pins
FOR ALL USING (user_id = public.os_current_user_id())
WITH CHECK (user_id = public.os_current_user_id());

CREATE OR REPLACE VIEW public.vw_os_access_debug AS
SELECT
  a.user_id,
  a.provider_id,
  a.home_id,
  a.role_key,
  a.access_level::text AS access_level,
  a.active,
  a.starts_at,
  a.ends_at
FROM public.os_user_home_access a;
