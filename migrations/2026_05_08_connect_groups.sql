-- IndiCare Connect Groups
-- Adds Teams-style groups for homes, safeguarding, managers, staff teams and child-linked circles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_group_type') THEN
    CREATE TYPE connect_group_type AS ENUM (
      'home_team',
      'shift_team',
      'management',
      'safeguarding',
      'dsl',
      'provider',
      'child_circle',
      'education_team',
      'health_team',
      'family_contact',
      'maintenance',
      'custom'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_group_role') THEN
    CREATE TYPE connect_group_role AS ENUM (
      'owner',
      'manager',
      'dsl',
      'member',
      'viewer',
      'external'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connect_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  group_type connect_group_type NOT NULL DEFAULT 'custom',
  name text NOT NULL,
  description text NULL,

  colour text NULL,
  icon text NULL,

  is_private boolean NOT NULL DEFAULT false,
  restricted boolean NOT NULL DEFAULT false,
  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  auto_created boolean NOT NULL DEFAULT false,

  created_by int4 NULL,
  archived boolean NOT NULL DEFAULT false,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_groups_provider ON public.connect_groups(provider_id);
CREATE INDEX IF NOT EXISTS idx_connect_groups_home ON public.connect_groups(home_id);
CREATE INDEX IF NOT EXISTS idx_connect_groups_child ON public.connect_groups(young_person_id);
CREATE INDEX IF NOT EXISTS idx_connect_groups_type ON public.connect_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_connect_groups_safeguarding ON public.connect_groups(safeguarding_relevant) WHERE safeguarding_relevant = true;

CREATE TABLE IF NOT EXISTS public.connect_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id uuid NOT NULL REFERENCES public.connect_groups(id) ON DELETE CASCADE,

  user_id int4 NULL,
  staff_id int4 NULL,
  young_person_id int4 NULL,
  adult_id int4 NULL,

  external_name text NULL,
  external_email text NULL,
  external_phone text NULL,
  organisation text NULL,

  group_role connect_group_role NOT NULL DEFAULT 'member',

  can_post boolean NOT NULL DEFAULT true,
  can_upload boolean NOT NULL DEFAULT true,
  can_invite boolean NOT NULL DEFAULT false,
  can_manage boolean NOT NULL DEFAULT false,
  can_view_restricted boolean NOT NULL DEFAULT false,

  muted boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,

  added_by int4 NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_group_members_unique_user
  ON public.connect_group_members(group_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_group_members_unique_staff
  ON public.connect_group_members(group_id, staff_id)
  WHERE staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_connect_group_members_group ON public.connect_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_connect_group_members_user ON public.connect_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_connect_group_members_staff ON public.connect_group_members(staff_id);

CREATE TABLE IF NOT EXISTS public.connect_group_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id uuid NOT NULL REFERENCES public.connect_groups(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.connect_channels(id) ON DELETE CASCADE,

  channel_purpose text NOT NULL DEFAULT 'general',
  is_default boolean NOT NULL DEFAULT false,
  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connect_group_channels_unique UNIQUE (group_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_connect_group_channels_group ON public.connect_group_channels(group_id);
CREATE INDEX IF NOT EXISTS idx_connect_group_channels_channel ON public.connect_group_channels(channel_id);

CREATE TABLE IF NOT EXISTS public.connect_group_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id uuid NOT NULL REFERENCES public.connect_groups(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES public.connect_calendars(id) ON DELETE CASCADE,

  calendar_purpose text NOT NULL DEFAULT 'group_diary',
  is_default boolean NOT NULL DEFAULT false,
  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connect_group_calendars_unique UNIQUE (group_id, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_connect_group_calendars_group ON public.connect_group_calendars(group_id);
CREATE INDEX IF NOT EXISTS idx_connect_group_calendars_calendar ON public.connect_group_calendars(calendar_id);

CREATE TABLE IF NOT EXISTS public.connect_group_record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  group_id uuid NOT NULL REFERENCES public.connect_groups(id) ON DELETE CASCADE,
  record_id uuid NOT NULL REFERENCES public.universal_records(id) ON DELETE CASCADE,

  link_type text NOT NULL DEFAULT 'group_context',
  summary text NULL,
  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connect_group_record_links_unique UNIQUE (group_id, record_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_connect_group_record_links_group ON public.connect_group_record_links(group_id);
CREATE INDEX IF NOT EXISTS idx_connect_group_record_links_record ON public.connect_group_record_links(record_id);

CREATE OR REPLACE FUNCTION public.connect_create_group(
  p_name text,
  p_group_type text DEFAULT 'custom',
  p_created_by int4 DEFAULT NULL,
  p_provider_id int4 DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_young_person_id int4 DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_is_private boolean DEFAULT false,
  p_restricted boolean DEFAULT false,
  p_safeguarding_relevant boolean DEFAULT false,
  p_inspection_relevant boolean DEFAULT false,
  p_create_default_channel boolean DEFAULT true,
  p_create_default_calendar boolean DEFAULT true,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id uuid;
  v_channel_id uuid;
  v_calendar_id uuid;
  v_group_type connect_group_type;
BEGIN
  v_group_type := CASE
    WHEN p_group_type IN ('home_team','shift_team','management','safeguarding','dsl','provider','child_circle','education_team','health_team','family_contact','maintenance','custom')
      THEN p_group_type::connect_group_type
    ELSE 'custom'::connect_group_type
  END;

  INSERT INTO public.connect_groups (
    provider_id, home_id, young_person_id, group_type, name, description,
    is_private, restricted, safeguarding_relevant, inspection_relevant,
    created_by, metadata
  )
  VALUES (
    p_provider_id, p_home_id, p_young_person_id, v_group_type, p_name, p_description,
    COALESCE(p_is_private,false), COALESCE(p_restricted,false), COALESCE(p_safeguarding_relevant,false), COALESCE(p_inspection_relevant,false),
    p_created_by, COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_group_id;

  IF p_created_by IS NOT NULL THEN
    INSERT INTO public.connect_group_members (group_id, user_id, group_role, can_manage, can_invite, can_view_restricted, added_by)
    VALUES (v_group_id, p_created_by, 'owner', true, true, true, p_created_by)
    ON CONFLICT DO NOTHING;
  END IF;

  IF COALESCE(p_create_default_channel,true) THEN
    INSERT INTO public.connect_channels (
      provider_id, home_id, young_person_id, channel_type, visibility, name, description,
      is_private, safeguarding_relevant, inspection_relevant, record_linked, created_by,
      metadata
    )
    VALUES (
      p_provider_id, p_home_id, p_young_person_id,
      CASE WHEN COALESCE(p_safeguarding_relevant,false) THEN 'safeguarding'::connect_channel_type ELSE 'team'::connect_channel_type END,
      CASE WHEN COALESCE(p_restricted,false) THEN 'restricted'::connect_visibility WHEN COALESCE(p_safeguarding_relevant,false) THEN 'dsl'::connect_visibility ELSE 'staff'::connect_visibility END,
      p_name || ' channel', p_description,
      COALESCE(p_is_private,false), COALESCE(p_safeguarding_relevant,false), COALESCE(p_inspection_relevant,false), p_young_person_id IS NOT NULL,
      p_created_by,
      jsonb_build_object('created_from_group_id', v_group_id)
    )
    RETURNING id INTO v_channel_id;

    INSERT INTO public.connect_group_channels (group_id, channel_id, channel_purpose, is_default, created_by)
    VALUES (v_group_id, v_channel_id, 'general', true, p_created_by);
  END IF;

  IF COALESCE(p_create_default_calendar,true) THEN
    INSERT INTO public.connect_calendars (
      provider_id, home_id, young_person_id, calendar_type, name, description,
      is_group_calendar, is_default, restricted, safeguarding_visible, inspection_relevant, created_by,
      metadata
    )
    VALUES (
      p_provider_id, p_home_id, p_young_person_id,
      CASE WHEN p_young_person_id IS NOT NULL THEN 'young_person'::connect_calendar_type WHEN p_home_id IS NOT NULL THEN 'home'::connect_calendar_type ELSE 'team'::connect_calendar_type END,
      p_name || ' diary', p_description,
      true, true, COALESCE(p_restricted,false), COALESCE(p_safeguarding_relevant,false), COALESCE(p_inspection_relevant,false), p_created_by,
      jsonb_build_object('created_from_group_id', v_group_id)
    )
    RETURNING id INTO v_calendar_id;

    INSERT INTO public.connect_group_calendars (group_id, calendar_id, calendar_purpose, is_default, created_by)
    VALUES (v_group_id, v_calendar_id, 'group_diary', true, p_created_by);
  END IF;

  RETURN v_group_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_connect_group_list AS
SELECT
  g.*,
  count(DISTINCT gm.id) FILTER (WHERE gm.removed_at IS NULL) AS member_count,
  count(DISTINCT gc.channel_id) AS channel_count,
  count(DISTINCT gcal.calendar_id) AS calendar_count,
  max(ch.latest_message_at) AS latest_message_at
FROM public.connect_groups g
LEFT JOIN public.connect_group_members gm ON gm.group_id = g.id
LEFT JOIN public.connect_group_channels gc ON gc.group_id = g.id
LEFT JOIN public.vw_connect_channel_list ch ON ch.id = gc.channel_id
LEFT JOIN public.connect_group_calendars gcal ON gcal.group_id = g.id
WHERE g.archived = false
GROUP BY g.id;

CREATE OR REPLACE VIEW public.vw_connect_group_member_feed AS
SELECT
  gm.*,
  g.name AS group_name,
  g.group_type,
  g.home_id,
  g.young_person_id,
  g.safeguarding_relevant
FROM public.connect_group_members gm
JOIN public.connect_groups g ON g.id = gm.group_id
WHERE gm.removed_at IS NULL;

CREATE OR REPLACE VIEW public.vw_child_connect_groups AS
SELECT *
FROM public.vw_connect_group_list
WHERE young_person_id IS NOT NULL
ORDER BY young_person_id, name;

CREATE OR REPLACE VIEW public.vw_home_connect_groups AS
SELECT *
FROM public.vw_connect_group_list
WHERE home_id IS NOT NULL
ORDER BY home_id, group_type, name;
