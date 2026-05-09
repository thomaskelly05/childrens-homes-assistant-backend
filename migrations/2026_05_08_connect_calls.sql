-- IndiCare Connect Calls
-- Voice/video calling layer for staff calls, handovers, supervisions, professionals meetings and family contact.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_call_type') THEN
    CREATE TYPE connect_call_type AS ENUM (
      'voice',
      'video',
      'family_contact',
      'supervision',
      'handover',
      'professionals_meeting',
      'strategy_meeting',
      'safeguarding',
      'provider_meeting',
      'emergency'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_call_status') THEN
    CREATE TYPE connect_call_status AS ENUM (
      'scheduled',
      'ringing',
      'live',
      'completed',
      'missed',
      'declined',
      'cancelled',
      'failed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_participant_status') THEN
    CREATE TYPE connect_participant_status AS ENUM (
      'invited',
      'ringing',
      'joined',
      'left',
      'declined',
      'missed',
      'removed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connect_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  channel_id uuid NULL REFERENCES public.connect_channels(id) ON DELETE SET NULL,
  meeting_id uuid NULL REFERENCES public.connect_meetings(id) ON DELETE SET NULL,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,
  task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE SET NULL,

  call_type connect_call_type NOT NULL DEFAULT 'video',
  status connect_call_status NOT NULL DEFAULT 'scheduled',

  title text NOT NULL,
  description text NULL,
  purpose text NULL,

  scheduled_start timestamptz NULL,
  scheduled_end timestamptz NULL,
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  duration_seconds int4 NULL,

  call_provider text NULL,
  external_call_id text NULL,
  join_url text NULL,
  host_url text NULL,
  dial_in_number text NULL,
  access_code text NULL,

  created_by int4 NULL,
  host_user_id int4 NULL,

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  restricted boolean NOT NULL DEFAULT false,
  recording_enabled boolean NOT NULL DEFAULT false,
  transcription_enabled boolean NOT NULL DEFAULT false,

  recording_url text NULL,
  transcript text NULL,
  minutes text NULL,
  decisions text NULL,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,

  cancellation_reason text NULL,
  failure_reason text NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_calls_home ON public.connect_calls(home_id, COALESCE(scheduled_start, started_at, created_at) DESC);
CREATE INDEX IF NOT EXISTS idx_connect_calls_child ON public.connect_calls(young_person_id, COALESCE(scheduled_start, started_at, created_at) DESC);
CREATE INDEX IF NOT EXISTS idx_connect_calls_channel ON public.connect_calls(channel_id);
CREATE INDEX IF NOT EXISTS idx_connect_calls_record ON public.connect_calls(record_id);
CREATE INDEX IF NOT EXISTS idx_connect_calls_status ON public.connect_calls(status);
CREATE INDEX IF NOT EXISTS idx_connect_calls_type ON public.connect_calls(call_type);
CREATE INDEX IF NOT EXISTS idx_connect_calls_safeguarding ON public.connect_calls(safeguarding_relevant) WHERE safeguarding_relevant = true;

CREATE TABLE IF NOT EXISTS public.connect_call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  call_id uuid NOT NULL REFERENCES public.connect_calls(id) ON DELETE CASCADE,

  user_id int4 NULL,
  staff_id int4 NULL,
  young_person_id int4 NULL,
  adult_id int4 NULL,

  external_name text NULL,
  external_email text NULL,
  external_phone text NULL,
  organisation text NULL,

  participant_role text NOT NULL DEFAULT 'participant',
  status connect_participant_status NOT NULL DEFAULT 'invited',

  invited_by int4 NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NULL,
  left_at timestamptz NULL,
  duration_seconds int4 NULL,

  muted_audio boolean NOT NULL DEFAULT false,
  muted_video boolean NOT NULL DEFAULT false,
  screen_sharing boolean NOT NULL DEFAULT false,

  attendance_note text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_connect_call_participants_call ON public.connect_call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_connect_call_participants_user ON public.connect_call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_connect_call_participants_staff ON public.connect_call_participants(staff_id);

CREATE TABLE IF NOT EXISTS public.connect_call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  call_id uuid NOT NULL REFERENCES public.connect_calls(id) ON DELETE CASCADE,
  participant_id uuid NULL REFERENCES public.connect_call_participants(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  event_summary text NULL,
  actor_id int4 NULL,

  previous_status text NULL,
  new_status text NULL,

  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_call_events_call ON public.connect_call_events(call_id);
CREATE INDEX IF NOT EXISTS idx_connect_call_events_created ON public.connect_call_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.connect_call_record_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  call_id uuid NOT NULL REFERENCES public.connect_calls(id) ON DELETE CASCADE,
  record_id uuid NOT NULL REFERENCES public.universal_records(id) ON DELETE CASCADE,

  link_type text NOT NULL DEFAULT 'call_discussion',
  summary text NULL,
  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connect_call_record_links_unique UNIQUE (call_id, record_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_connect_call_record_links_call ON public.connect_call_record_links(call_id);
CREATE INDEX IF NOT EXISTS idx_connect_call_record_links_record ON public.connect_call_record_links(record_id);

CREATE TABLE IF NOT EXISTS public.connect_call_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  call_id uuid NOT NULL REFERENCES public.connect_calls(id) ON DELETE CASCADE,
  universal_attachment_id uuid NULL REFERENCES public.universal_record_attachments(id) ON DELETE SET NULL,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  file_name text NOT NULL,
  original_file_name text NULL,
  mime_type text NULL,
  storage_path text NOT NULL,
  public_url text NULL,
  file_size_bytes int8 NULL,

  attachment_type text NOT NULL DEFAULT 'call_file',
  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  restricted boolean NOT NULL DEFAULT false,

  uploaded_by int4 NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_connect_call_attachments_call ON public.connect_call_attachments(call_id);
CREATE INDEX IF NOT EXISTS idx_connect_call_attachments_record ON public.connect_call_attachments(record_id);

CREATE OR REPLACE FUNCTION public.connect_create_call(
  p_title text,
  p_call_type text DEFAULT 'video',
  p_created_by int4 DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_provider_id int4 DEFAULT NULL,
  p_young_person_id int4 DEFAULT NULL,
  p_staff_id int4 DEFAULT NULL,
  p_adult_id int4 DEFAULT NULL,
  p_channel_id uuid DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_task_id uuid DEFAULT NULL,
  p_scheduled_start timestamptz DEFAULT NULL,
  p_scheduled_end timestamptz DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_purpose text DEFAULT NULL,
  p_safeguarding_relevant boolean DEFAULT false,
  p_inspection_relevant boolean DEFAULT false,
  p_restricted boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_call_id uuid;
  v_call_type connect_call_type;
BEGIN
  v_call_type := CASE
    WHEN p_call_type IN ('voice','video','family_contact','supervision','handover','professionals_meeting','strategy_meeting','safeguarding','provider_meeting','emergency')
      THEN p_call_type::connect_call_type
    ELSE 'video'::connect_call_type
  END;

  INSERT INTO public.connect_calls (
    provider_id, home_id, young_person_id, staff_id, adult_id,
    channel_id, meeting_id, record_id, task_id,
    call_type, status, title, description, purpose,
    scheduled_start, scheduled_end,
    created_by, host_user_id,
    safeguarding_relevant, inspection_relevant, restricted,
    metadata
  )
  VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_staff_id, p_adult_id,
    p_channel_id, p_meeting_id, p_record_id, p_task_id,
    v_call_type, CASE WHEN p_scheduled_start IS NULL THEN 'ringing'::connect_call_status ELSE 'scheduled'::connect_call_status END,
    p_title, p_description, p_purpose,
    p_scheduled_start, p_scheduled_end,
    p_created_by, p_created_by,
    COALESCE(p_safeguarding_relevant,false), COALESCE(p_inspection_relevant,false), COALESCE(p_restricted,false),
    COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_call_id;

  IF p_record_id IS NOT NULL THEN
    INSERT INTO public.connect_call_record_links (call_id, record_id, link_type, created_by)
    VALUES (v_call_id, p_record_id, 'call_discussion', p_created_by)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.connect_call_events (
    call_id, event_type, event_summary, actor_id, new_status, metadata
  )
  VALUES (
    v_call_id, 'call_created', 'Connect call created', p_created_by,
    CASE WHEN p_scheduled_start IS NULL THEN 'ringing' ELSE 'scheduled' END,
    jsonb_build_object('call_type', v_call_type)
  );

  RETURN v_call_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.connect_update_call_status(
  p_call_id uuid,
  p_status text,
  p_actor_id int4 DEFAULT NULL,
  p_event_summary text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_status text;
  v_status connect_call_status;
BEGIN
  v_status := CASE
    WHEN p_status IN ('scheduled','ringing','live','completed','missed','declined','cancelled','failed')
      THEN p_status::connect_call_status
    ELSE 'live'::connect_call_status
  END;

  SELECT status::text INTO v_previous_status FROM public.connect_calls WHERE id = p_call_id;
  IF v_previous_status IS NULL THEN
    RAISE EXCEPTION 'Connect call not found: %', p_call_id;
  END IF;

  UPDATE public.connect_calls
  SET status = v_status,
      started_at = CASE WHEN v_status = 'live' AND started_at IS NULL THEN now() ELSE started_at END,
      ended_at = CASE WHEN v_status IN ('completed','missed','declined','cancelled','failed') THEN now() ELSE ended_at END,
      duration_seconds = CASE
        WHEN v_status IN ('completed','missed','declined','cancelled','failed') AND started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (now() - started_at))::int4
        ELSE duration_seconds
      END,
      updated_at = now()
  WHERE id = p_call_id;

  INSERT INTO public.connect_call_events (
    call_id, event_type, event_summary, actor_id, previous_status, new_status, metadata
  )
  VALUES (
    p_call_id, 'call_status_changed', COALESCE(p_event_summary, 'Call status changed to ' || v_status::text),
    p_actor_id, v_previous_status, v_status::text, COALESCE(p_metadata,'{}'::jsonb)
  );

  RETURN p_call_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_connect_call_feed AS
SELECT
  c.*,
  ch.name AS channel_name,
  r.title AS linked_record_title,
  r.record_type AS linked_record_type,
  t.title AS linked_task_title,
  count(p.id) AS participant_count,
  count(p.id) FILTER (WHERE p.status = 'joined') AS active_participants,
  count(p.id) FILTER (WHERE p.joined_at IS NOT NULL) AS joined_count
FROM public.connect_calls c
LEFT JOIN public.connect_channels ch ON ch.id = c.channel_id
LEFT JOIN public.universal_records r ON r.id = c.record_id
LEFT JOIN public.universal_tasks t ON t.id = c.task_id
LEFT JOIN public.connect_call_participants p ON p.call_id = c.id
GROUP BY c.id, ch.name, r.title, r.record_type, t.title
ORDER BY COALESCE(c.scheduled_start, c.started_at, c.created_at) DESC;

CREATE OR REPLACE VIEW public.vw_child_connect_call_timeline AS
SELECT
  id,
  young_person_id,
  home_id,
  channel_id,
  record_id,
  task_id,
  call_type::text AS call_type,
  status::text AS status,
  title,
  description,
  purpose,
  scheduled_start,
  started_at,
  ended_at,
  duration_seconds,
  safeguarding_relevant,
  inspection_relevant,
  created_by,
  created_at
FROM public.connect_calls
WHERE young_person_id IS NOT NULL
ORDER BY young_person_id, COALESCE(scheduled_start, started_at, created_at) DESC;

CREATE OR REPLACE VIEW public.vw_home_call_dashboard AS
SELECT
  home_id,
  count(*) AS total_calls,
  count(*) FILTER (WHERE status = 'live') AS live_calls,
  count(*) FILTER (WHERE status = 'scheduled' AND scheduled_start::date = current_date) AS scheduled_today,
  count(*) FILTER (WHERE call_type = 'family_contact') AS family_contact_calls,
  count(*) FILTER (WHERE call_type IN ('safeguarding','strategy_meeting')) AS safeguarding_calls,
  count(*) FILTER (WHERE call_type = 'supervision') AS supervision_calls,
  count(*) FILTER (WHERE status = 'missed') AS missed_calls,
  max(COALESCE(started_at, scheduled_start, created_at)) AS latest_call_at
FROM public.connect_calls
GROUP BY home_id;
