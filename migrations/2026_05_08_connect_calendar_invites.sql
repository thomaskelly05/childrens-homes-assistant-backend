-- IndiCare Connect Calendar, Invites and Secure Join Links
-- Adds home, child, staff and provider calendars plus Teams-style meeting invites and one-time join links.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_calendar_type') THEN
    CREATE TYPE connect_calendar_type AS ENUM (
      'home',
      'young_person',
      'staff',
      'provider',
      'team',
      'safeguarding',
      'personal'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_calendar_event_type') THEN
    CREATE TYPE connect_calendar_event_type AS ENUM (
      'meeting',
      'call',
      'family_contact',
      'supervision',
      'professional_visit',
      'health_appointment',
      'education_meeting',
      'court',
      'review',
      'handover',
      'shift',
      'task_due',
      'medication',
      'activity',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_invite_status') THEN
    CREATE TYPE connect_invite_status AS ENUM (
      'pending',
      'sent',
      'accepted',
      'declined',
      'tentative',
      'cancelled',
      'expired',
      'used'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connect_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  calendar_type connect_calendar_type NOT NULL DEFAULT 'home',
  name text NOT NULL,
  description text NULL,
  colour text NULL,

  is_group_calendar boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  restricted boolean NOT NULL DEFAULT false,
  safeguarding_visible boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,

  created_by int4 NULL,
  archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_calendars_home ON public.connect_calendars(home_id);
CREATE INDEX IF NOT EXISTS idx_connect_calendars_child ON public.connect_calendars(young_person_id);
CREATE INDEX IF NOT EXISTS idx_connect_calendars_staff ON public.connect_calendars(staff_id);
CREATE INDEX IF NOT EXISTS idx_connect_calendars_provider ON public.connect_calendars(provider_id);
CREATE INDEX IF NOT EXISTS idx_connect_calendars_type ON public.connect_calendars(calendar_type);

CREATE TABLE IF NOT EXISTS public.connect_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NULL REFERENCES public.connect_calendars(id) ON DELETE SET NULL,

  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  channel_id uuid NULL REFERENCES public.connect_channels(id) ON DELETE SET NULL,
  meeting_id uuid NULL REFERENCES public.connect_meetings(id) ON DELETE SET NULL,
  call_id uuid NULL REFERENCES public.connect_calls(id) ON DELETE SET NULL,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,
  task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE SET NULL,

  event_type connect_calendar_event_type NOT NULL DEFAULT 'meeting',
  title text NOT NULL,
  description text NULL,
  location text NULL,

  starts_at timestamptz NOT NULL,
  ends_at timestamptz NULL,
  all_day boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Europe/London',

  recurrence_rule text NULL,
  recurrence_parent_id uuid NULL REFERENCES public.connect_calendar_events(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'scheduled',
  priority text NOT NULL DEFAULT 'normal',

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  restricted boolean NOT NULL DEFAULT false,
  child_visible boolean NOT NULL DEFAULT false,

  created_by int4 NULL,
  updated_by int4 NULL,
  cancelled_by int4 NULL,
  cancelled_at timestamptz NULL,
  cancellation_reason text NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_events_calendar ON public.connect_calendar_events(calendar_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_connect_events_home ON public.connect_calendar_events(home_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_connect_events_child ON public.connect_calendar_events(young_person_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_connect_events_staff ON public.connect_calendar_events(staff_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_connect_events_provider ON public.connect_calendar_events(provider_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_connect_events_call ON public.connect_calendar_events(call_id);
CREATE INDEX IF NOT EXISTS idx_connect_events_meeting ON public.connect_calendar_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_connect_events_record ON public.connect_calendar_events(record_id);

CREATE TABLE IF NOT EXISTS public.connect_calendar_event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.connect_calendar_events(id) ON DELETE CASCADE,

  user_id int4 NULL,
  staff_id int4 NULL,
  young_person_id int4 NULL,
  adult_id int4 NULL,

  external_name text NULL,
  external_email text NULL,
  external_phone text NULL,
  organisation text NULL,
  attendee_role text NOT NULL DEFAULT 'attendee',

  invite_status connect_invite_status NOT NULL DEFAULT 'pending',
  response_note text NULL,

  invited_by int4 NULL,
  invited_at timestamptz NULL,
  responded_at timestamptz NULL,

  attended boolean NULL,
  joined_at timestamptz NULL,
  left_at timestamptz NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_event_attendees_event ON public.connect_calendar_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_connect_event_attendees_user ON public.connect_calendar_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_connect_event_attendees_staff ON public.connect_calendar_event_attendees(staff_id);
CREATE INDEX IF NOT EXISTS idx_connect_event_attendees_email ON public.connect_calendar_event_attendees(external_email);

CREATE TABLE IF NOT EXISTS public.connect_secure_join_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id uuid NULL REFERENCES public.connect_calendar_events(id) ON DELETE CASCADE,
  call_id uuid NULL REFERENCES public.connect_calls(id) ON DELETE CASCADE,
  meeting_id uuid NULL REFERENCES public.connect_meetings(id) ON DELETE CASCADE,
  attendee_id uuid NULL REFERENCES public.connect_calendar_event_attendees(id) ON DELETE CASCADE,

  token_hash text NOT NULL UNIQUE,
  token_hint text NULL,

  recipient_name text NULL,
  recipient_email text NULL,
  recipient_phone text NULL,

  one_time_use boolean NOT NULL DEFAULT true,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz NULL,
  used_by_ip text NULL,
  used_user_agent text NULL,

  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz NULL,
  revoked_by int4 NULL,
  revoke_reason text NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_secure_join_links_event ON public.connect_secure_join_links(event_id);
CREATE INDEX IF NOT EXISTS idx_secure_join_links_call ON public.connect_secure_join_links(call_id);
CREATE INDEX IF NOT EXISTS idx_secure_join_links_expires ON public.connect_secure_join_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_secure_join_links_recipient_email ON public.connect_secure_join_links(recipient_email);

CREATE TABLE IF NOT EXISTS public.connect_invite_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id uuid NULL REFERENCES public.connect_calendar_events(id) ON DELETE CASCADE,
  call_id uuid NULL REFERENCES public.connect_calls(id) ON DELETE CASCADE,
  meeting_id uuid NULL REFERENCES public.connect_meetings(id) ON DELETE CASCADE,
  attendee_id uuid NULL REFERENCES public.connect_calendar_event_attendees(id) ON DELETE SET NULL,
  secure_link_id uuid NULL REFERENCES public.connect_secure_join_links(id) ON DELETE SET NULL,

  delivery_method text NOT NULL DEFAULT 'email',
  recipient text NOT NULL,
  subject text NULL,
  body text NULL,

  status text NOT NULL DEFAULT 'pending',
  provider_message_id text NULL,
  error_message text NULL,

  sent_by int4 NULL,
  sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_invite_delivery_event ON public.connect_invite_delivery_log(event_id);
CREATE INDEX IF NOT EXISTS idx_invite_delivery_status ON public.connect_invite_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_invite_delivery_recipient ON public.connect_invite_delivery_log(recipient);

CREATE OR REPLACE FUNCTION public.connect_create_calendar_event(
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz DEFAULT NULL,
  p_event_type text DEFAULT 'meeting',
  p_calendar_id uuid DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_provider_id int4 DEFAULT NULL,
  p_young_person_id int4 DEFAULT NULL,
  p_staff_id int4 DEFAULT NULL,
  p_channel_id uuid DEFAULT NULL,
  p_call_id uuid DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_task_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_created_by int4 DEFAULT NULL,
  p_safeguarding_relevant boolean DEFAULT false,
  p_inspection_relevant boolean DEFAULT false,
  p_restricted boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id uuid;
  v_event_type connect_calendar_event_type;
BEGIN
  v_event_type := CASE
    WHEN p_event_type IN ('meeting','call','family_contact','supervision','professional_visit','health_appointment','education_meeting','court','review','handover','shift','task_due','medication','activity','other')
    THEN p_event_type::connect_calendar_event_type
    ELSE 'meeting'::connect_calendar_event_type
  END;

  INSERT INTO public.connect_calendar_events (
    calendar_id, provider_id, home_id, young_person_id, staff_id,
    channel_id, meeting_id, call_id, record_id, task_id,
    event_type, title, description, location,
    starts_at, ends_at, created_by,
    safeguarding_relevant, inspection_relevant, restricted, metadata
  )
  VALUES (
    p_calendar_id, p_provider_id, p_home_id, p_young_person_id, p_staff_id,
    p_channel_id, p_meeting_id, p_call_id, p_record_id, p_task_id,
    v_event_type, p_title, p_description, p_location,
    p_starts_at, p_ends_at, p_created_by,
    COALESCE(p_safeguarding_relevant,false), COALESCE(p_inspection_relevant,false), COALESCE(p_restricted,false), COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.connect_generate_secure_join_link(
  p_event_id uuid DEFAULT NULL,
  p_call_id uuid DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL,
  p_attendee_id uuid DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_recipient_phone text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(link_id uuid, raw_token text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_token text;
  v_hash text;
  v_link_id uuid;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.connect_secure_join_links (
    event_id, call_id, meeting_id, attendee_id,
    token_hash, token_hint,
    recipient_name, recipient_email, recipient_phone,
    expires_at, created_by, metadata
  )
  VALUES (
    p_event_id, p_call_id, p_meeting_id, p_attendee_id,
    v_hash, right(v_token, 6),
    p_recipient_name, p_recipient_email, p_recipient_phone,
    COALESCE(p_expires_at, now() + interval '7 days'), p_created_by, COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_link_id;

  RETURN QUERY SELECT v_link_id, v_token;
END;
$$;

CREATE OR REPLACE VIEW public.vw_connect_calendar_feed AS
SELECT
  e.*,
  c.name AS calendar_name,
  ch.name AS channel_name,
  cl.title AS call_title,
  mt.title AS meeting_title,
  r.title AS record_title,
  t.title AS task_title,
  count(a.id) AS attendee_count,
  count(a.id) FILTER (WHERE a.invite_status = 'accepted') AS accepted_count,
  count(a.id) FILTER (WHERE a.invite_status = 'declined') AS declined_count
FROM public.connect_calendar_events e
LEFT JOIN public.connect_calendars c ON c.id = e.calendar_id
LEFT JOIN public.connect_channels ch ON ch.id = e.channel_id
LEFT JOIN public.connect_calls cl ON cl.id = e.call_id
LEFT JOIN public.connect_meetings mt ON mt.id = e.meeting_id
LEFT JOIN public.universal_records r ON r.id = e.record_id
LEFT JOIN public.universal_tasks t ON t.id = e.task_id
LEFT JOIN public.connect_calendar_event_attendees a ON a.event_id = e.id
WHERE e.status <> 'cancelled'
GROUP BY e.id, c.name, ch.name, cl.title, mt.title, r.title, t.title
ORDER BY e.starts_at ASC;

CREATE OR REPLACE VIEW public.vw_home_calendar_dashboard AS
SELECT
  home_id,
  count(*) FILTER (WHERE starts_at::date = current_date) AS events_today,
  count(*) FILTER (WHERE starts_at >= now() AND starts_at < now() + interval '7 days') AS events_next_7_days,
  count(*) FILTER (WHERE event_type = 'family_contact') AS family_contact_events,
  count(*) FILTER (WHERE event_type IN ('health_appointment','education_meeting','court','review')) AS professional_events,
  count(*) FILTER (WHERE safeguarding_relevant) AS safeguarding_events,
  min(starts_at) FILTER (WHERE starts_at >= now()) AS next_event_at
FROM public.connect_calendar_events
WHERE status <> 'cancelled'
GROUP BY home_id;

CREATE OR REPLACE VIEW public.vw_child_calendar_timeline AS
SELECT
  id,
  young_person_id,
  home_id,
  event_type::text AS event_type,
  title,
  description,
  location,
  starts_at,
  ends_at,
  status,
  safeguarding_relevant,
  inspection_relevant,
  record_id,
  call_id,
  meeting_id,
  task_id,
  created_by,
  created_at
FROM public.connect_calendar_events
WHERE young_person_id IS NOT NULL
  AND status <> 'cancelled'
ORDER BY young_person_id, starts_at DESC;
