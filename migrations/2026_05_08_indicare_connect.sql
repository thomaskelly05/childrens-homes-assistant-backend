-- IndiCare Connect
-- Care-sector communication layer: channels, messages, meetings, record-linked conversations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_channel_type') THEN
    CREATE TYPE connect_channel_type AS ENUM (
      'direct',
      'home',
      'team',
      'provider',
      'child_record',
      'staff_record',
      'safeguarding',
      'handover',
      'meeting',
      'announcement'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_message_type') THEN
    CREATE TYPE connect_message_type AS ENUM (
      'message',
      'system',
      'voice_note',
      'handover_note',
      'decision',
      'safeguarding_update',
      'task_update',
      'record_update',
      'meeting_note'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_visibility') THEN
    CREATE TYPE connect_visibility AS ENUM (
      'staff',
      'manager',
      'dsl',
      'provider',
      'restricted'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_meeting_status') THEN
    CREATE TYPE connect_meeting_status AS ENUM (
      'scheduled',
      'live',
      'completed',
      'cancelled',
      'missed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connect_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  channel_type connect_channel_type NOT NULL DEFAULT 'team',
  visibility connect_visibility NOT NULL DEFAULT 'staff',

  name text NOT NULL,
  description text NULL,

  is_private boolean NOT NULL DEFAULT false,
  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  record_linked boolean NOT NULL DEFAULT false,

  created_by int4 NULL,
  archived boolean NOT NULL DEFAULT false,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_channels_home ON public.connect_channels(home_id);
CREATE INDEX IF NOT EXISTS idx_connect_channels_child ON public.connect_channels(young_person_id);
CREATE INDEX IF NOT EXISTS idx_connect_channels_provider ON public.connect_channels(provider_id);
CREATE INDEX IF NOT EXISTS idx_connect_channels_type ON public.connect_channels(channel_type);

CREATE TABLE IF NOT EXISTS public.connect_channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.connect_channels(id) ON DELETE CASCADE,

  user_id int4 NULL,
  staff_id int4 NULL,
  role text NOT NULL DEFAULT 'member',

  can_post boolean NOT NULL DEFAULT true,
  can_upload boolean NOT NULL DEFAULT true,
  can_invite boolean NOT NULL DEFAULT false,
  can_manage boolean NOT NULL DEFAULT false,

  muted boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,

  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NULL,
  removed_at timestamptz NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT connect_channel_members_unique UNIQUE (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_connect_members_channel ON public.connect_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_connect_members_user ON public.connect_channel_members(user_id);

CREATE TABLE IF NOT EXISTS public.connect_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.connect_channels(id) ON DELETE CASCADE,

  parent_message_id uuid NULL REFERENCES public.connect_messages(id) ON DELETE SET NULL,

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  message_type connect_message_type NOT NULL DEFAULT 'message',
  visibility connect_visibility NOT NULL DEFAULT 'staff',

  body text NOT NULL,
  plain_text text NULL,

  created_by int4 NULL,
  edited_by int4 NULL,
  deleted_by int4 NULL,

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  promote_to_record boolean NOT NULL DEFAULT false,
  promoted_record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE SET NULL,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  edited_at timestamptz NULL,
  deleted_at timestamptz NULL,
  deleted_reason text NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_messages_channel ON public.connect_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connect_messages_child ON public.connect_messages(young_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connect_messages_home ON public.connect_messages(home_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connect_messages_record ON public.connect_messages(record_id);
CREATE INDEX IF NOT EXISTS idx_connect_messages_task ON public.connect_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_connect_messages_safeguarding ON public.connect_messages(safeguarding_relevant) WHERE safeguarding_relevant = true;

CREATE TABLE IF NOT EXISTS public.connect_message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.connect_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.connect_channels(id) ON DELETE CASCADE,
  user_id int4 NULL,
  staff_id int4 NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connect_read_receipts_unique UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_connect_receipts_message ON public.connect_message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_connect_receipts_user ON public.connect_message_read_receipts(user_id);

CREATE TABLE IF NOT EXISTS public.connect_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.connect_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.connect_channels(id) ON DELETE CASCADE,

  universal_attachment_id uuid NULL REFERENCES public.universal_record_attachments(id) ON DELETE SET NULL,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  file_name text NOT NULL,
  original_file_name text NULL,
  mime_type text NULL,
  storage_path text NOT NULL,
  public_url text NULL,
  file_size_bytes int8 NULL,

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  restricted boolean NOT NULL DEFAULT false,

  uploaded_by int4 NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_connect_attachments_message ON public.connect_message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_connect_attachments_channel ON public.connect_message_attachments(channel_id);

CREATE TABLE IF NOT EXISTS public.connect_message_record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.connect_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.connect_channels(id) ON DELETE CASCADE,

  record_id uuid NOT NULL REFERENCES public.universal_records(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'discussion',
  summary text NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connect_message_record_links_unique UNIQUE (message_id, record_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_connect_links_message ON public.connect_message_record_links(message_id);
CREATE INDEX IF NOT EXISTS idx_connect_links_record ON public.connect_message_record_links(record_id);

CREATE TABLE IF NOT EXISTS public.connect_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NULL REFERENCES public.connect_channels(id) ON DELETE SET NULL,

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  meeting_type text NOT NULL DEFAULT 'team_meeting',
  title text NOT NULL,
  description text NULL,

  status connect_meeting_status NOT NULL DEFAULT 'scheduled',
  visibility connect_visibility NOT NULL DEFAULT 'staff',

  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NULL,
  actual_start timestamptz NULL,
  actual_end timestamptz NULL,

  meeting_url text NULL,
  provider text NULL,
  external_meeting_id text NULL,

  agenda text NULL,
  minutes text NULL,
  decisions text NULL,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_connect_meetings_home ON public.connect_meetings(home_id, scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_connect_meetings_child ON public.connect_meetings(young_person_id, scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_connect_meetings_status ON public.connect_meetings(status);

CREATE TABLE IF NOT EXISTS public.connect_meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.connect_meetings(id) ON DELETE CASCADE,

  user_id int4 NULL,
  staff_id int4 NULL,
  external_name text NULL,
  external_email text NULL,
  attendee_role text NOT NULL DEFAULT 'attendee',

  response_status text NOT NULL DEFAULT 'needs_action',
  attended boolean NULL,
  joined_at timestamptz NULL,
  left_at timestamptz NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_attendees_meeting ON public.connect_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_connect_attendees_user ON public.connect_meeting_attendees(user_id);

CREATE TABLE IF NOT EXISTS public.connect_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NULL REFERENCES public.connect_channels(id) ON DELETE SET NULL,
  message_id uuid NULL REFERENCES public.connect_messages(id) ON DELETE SET NULL,
  meeting_id uuid NULL REFERENCES public.connect_meetings(id) ON DELETE SET NULL,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  event_summary text NULL,
  actor_id int4 NULL,
  ip_address text NULL,
  user_agent text NULL,
  before_snapshot jsonb NULL,
  after_snapshot jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_audit_channel ON public.connect_audit_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_connect_audit_message ON public.connect_audit_events(message_id);
CREATE INDEX IF NOT EXISTS idx_connect_audit_record ON public.connect_audit_events(record_id);

CREATE OR REPLACE FUNCTION public.connect_post_message(
  p_channel_id uuid,
  p_body text,
  p_created_by int4 DEFAULT NULL,
  p_message_type text DEFAULT 'message',
  p_record_id uuid DEFAULT NULL,
  p_task_id uuid DEFAULT NULL,
  p_safeguarding_relevant boolean DEFAULT false,
  p_promote_to_record boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id uuid;
  v_channel public.connect_channels%ROWTYPE;
  v_type connect_message_type;
BEGIN
  SELECT * INTO v_channel FROM public.connect_channels WHERE id = p_channel_id AND archived = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connect channel not found: %', p_channel_id;
  END IF;

  v_type := CASE
    WHEN p_message_type IN ('message','system','voice_note','handover_note','decision','safeguarding_update','task_update','record_update','meeting_note')
    THEN p_message_type::connect_message_type
    ELSE 'message'::connect_message_type
  END;

  INSERT INTO public.connect_messages (
    channel_id,
    provider_id,
    home_id,
    young_person_id,
    staff_id,
    adult_id,
    message_type,
    visibility,
    body,
    plain_text,
    created_by,
    safeguarding_relevant,
    inspection_relevant,
    promote_to_record,
    task_id,
    record_id,
    metadata
  )
  VALUES (
    p_channel_id,
    v_channel.provider_id,
    v_channel.home_id,
    v_channel.young_person_id,
    v_channel.staff_id,
    v_channel.adult_id,
    v_type,
    v_channel.visibility,
    p_body,
    p_body,
    p_created_by,
    COALESCE(p_safeguarding_relevant, false) OR v_channel.safeguarding_relevant,
    v_channel.inspection_relevant,
    COALESCE(p_promote_to_record, false),
    p_task_id,
    p_record_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_message_id;

  IF p_record_id IS NOT NULL THEN
    INSERT INTO public.connect_message_record_links (message_id, channel_id, record_id, link_type, created_by)
    VALUES (v_message_id, p_channel_id, p_record_id, 'discussion', p_created_by)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.connect_audit_events (
    channel_id,
    message_id,
    record_id,
    event_type,
    event_summary,
    actor_id,
    after_snapshot
  )
  VALUES (
    p_channel_id,
    v_message_id,
    p_record_id,
    'message_posted',
    'Message posted in IndiCare Connect',
    p_created_by,
    jsonb_build_object('message_id', v_message_id, 'channel_id', p_channel_id, 'message_type', v_type)
  );

  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_connect_channel_list AS
SELECT
  c.*,
  count(DISTINCT m.id) AS message_count,
  max(m.created_at) AS latest_message_at,
  count(DISTINCT cm.id) AS member_count
FROM public.connect_channels c
LEFT JOIN public.connect_messages m ON m.channel_id = c.id AND m.deleted_at IS NULL
LEFT JOIN public.connect_channel_members cm ON cm.channel_id = c.id AND cm.removed_at IS NULL
WHERE c.archived = false
GROUP BY c.id;

CREATE OR REPLACE VIEW public.vw_connect_message_feed AS
SELECT
  m.*,
  c.name AS channel_name,
  c.channel_type,
  c.is_private,
  c.record_linked,
  r.title AS linked_record_title,
  r.record_type AS linked_record_type,
  t.title AS linked_task_title
FROM public.connect_messages m
JOIN public.connect_channels c ON c.id = m.channel_id
LEFT JOIN public.universal_records r ON r.id = m.record_id
LEFT JOIN public.universal_tasks t ON t.id = m.task_id
WHERE m.deleted_at IS NULL
ORDER BY m.created_at DESC;

CREATE OR REPLACE VIEW public.vw_child_connect_timeline AS
SELECT
  m.id,
  m.young_person_id,
  m.home_id,
  m.channel_id,
  c.name AS channel_name,
  m.message_type::text AS message_type,
  m.body,
  m.created_by,
  m.created_at,
  m.safeguarding_relevant,
  m.record_id,
  m.task_id
FROM public.connect_messages m
JOIN public.connect_channels c ON c.id = m.channel_id
WHERE m.young_person_id IS NOT NULL
  AND m.deleted_at IS NULL
ORDER BY m.young_person_id, m.created_at DESC;

CREATE OR REPLACE VIEW public.vw_connect_meeting_feed AS
SELECT
  mt.*,
  c.name AS channel_name,
  count(a.id) AS attendee_count,
  count(a.id) FILTER (WHERE a.attended = true) AS attended_count
FROM public.connect_meetings mt
LEFT JOIN public.connect_channels c ON c.id = mt.channel_id
LEFT JOIN public.connect_meeting_attendees a ON a.meeting_id = mt.id
GROUP BY mt.id, c.name
ORDER BY mt.scheduled_start DESC;
