-- IndiCare Connect Presence and Shift Awareness
-- Adds live operational awareness: online, on shift, handover, incident response, supervision and availability.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_presence_status') THEN
    CREATE TYPE connect_presence_status AS ENUM (
      'online',
      'available',
      'busy',
      'handover',
      'incident_response',
      'supervision',
      'meeting',
      'on_break',
      'on_shift',
      'offline'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connect_device_type') THEN
    CREATE TYPE connect_device_type AS ENUM (
      'desktop',
      'tablet',
      'mobile',
      'unknown'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connect_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id int4 NULL,
  staff_id int4 NULL,
  provider_id int4 NULL,
  home_id int4 NULL,

  current_status connect_presence_status NOT NULL DEFAULT 'offline',
  status_message text NULL,

  active_channel_id uuid NULL REFERENCES public.connect_channels(id) ON DELETE SET NULL,
  active_meeting_id uuid NULL REFERENCES public.connect_meetings(id) ON DELETE SET NULL,
  active_task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE SET NULL,
  active_record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,

  active_shift_id text NULL,
  shift_label text NULL,
  on_shift boolean NOT NULL DEFAULT false,

  device_type connect_device_type NOT NULL DEFAULT 'unknown',
  device_label text NULL,
  ip_address text NULL,
  user_agent text NULL,

  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz NOT NULL DEFAULT now(),

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connect_presence_unique_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_connect_presence_home ON public.connect_presence(home_id);
CREATE INDEX IF NOT EXISTS idx_connect_presence_staff ON public.connect_presence(staff_id);
CREATE INDEX IF NOT EXISTS idx_connect_presence_status ON public.connect_presence(current_status);
CREATE INDEX IF NOT EXISTS idx_connect_presence_last_seen ON public.connect_presence(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_connect_presence_shift ON public.connect_presence(on_shift);

CREATE TABLE IF NOT EXISTS public.connect_presence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id int4 NULL,
  staff_id int4 NULL,
  provider_id int4 NULL,
  home_id int4 NULL,

  previous_status text NULL,
  new_status text NOT NULL,
  event_type text NOT NULL DEFAULT 'status_changed',
  event_summary text NULL,

  active_channel_id uuid NULL,
  active_meeting_id uuid NULL,
  active_task_id uuid NULL,
  active_record_id uuid NULL,

  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connect_presence_events_user ON public.connect_presence_events(user_id);
CREATE INDEX IF NOT EXISTS idx_connect_presence_events_home ON public.connect_presence_events(home_id);
CREATE INDEX IF NOT EXISTS idx_connect_presence_events_created ON public.connect_presence_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.connect_update_presence(
  p_user_id int4,
  p_staff_id int4 DEFAULT NULL,
  p_provider_id int4 DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_status text DEFAULT 'online',
  p_status_message text DEFAULT NULL,
  p_active_channel_id uuid DEFAULT NULL,
  p_active_meeting_id uuid DEFAULT NULL,
  p_active_task_id uuid DEFAULT NULL,
  p_active_record_id uuid DEFAULT NULL,
  p_active_shift_id text DEFAULT NULL,
  p_shift_label text DEFAULT NULL,
  p_on_shift boolean DEFAULT false,
  p_device_type text DEFAULT 'unknown',
  p_device_label text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_presence_id uuid;
  v_previous_status text;
  v_status connect_presence_status;
  v_device connect_device_type;
BEGIN
  v_status := CASE
    WHEN p_status IN ('online','available','busy','handover','incident_response','supervision','meeting','on_break','on_shift','offline')
      THEN p_status::connect_presence_status
    ELSE 'online'::connect_presence_status
  END;

  v_device := CASE
    WHEN p_device_type IN ('desktop','tablet','mobile','unknown')
      THEN p_device_type::connect_device_type
    ELSE 'unknown'::connect_device_type
  END;

  SELECT current_status::text
  INTO v_previous_status
  FROM public.connect_presence
  WHERE user_id = p_user_id;

  INSERT INTO public.connect_presence (
    user_id, staff_id, provider_id, home_id, current_status, status_message,
    active_channel_id, active_meeting_id, active_task_id, active_record_id,
    active_shift_id, shift_label, on_shift,
    device_type, device_label, ip_address, user_agent,
    last_seen_at, status_changed_at, metadata
  )
  VALUES (
    p_user_id, p_staff_id, p_provider_id, p_home_id, v_status, p_status_message,
    p_active_channel_id, p_active_meeting_id, p_active_task_id, p_active_record_id,
    p_active_shift_id, p_shift_label, COALESCE(p_on_shift,false),
    v_device, p_device_label, p_ip_address, p_user_agent,
    now(), now(), COALESCE(p_metadata,'{}'::jsonb)
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    staff_id = COALESCE(EXCLUDED.staff_id, public.connect_presence.staff_id),
    provider_id = COALESCE(EXCLUDED.provider_id, public.connect_presence.provider_id),
    home_id = COALESCE(EXCLUDED.home_id, public.connect_presence.home_id),
    current_status = EXCLUDED.current_status,
    status_message = EXCLUDED.status_message,
    active_channel_id = EXCLUDED.active_channel_id,
    active_meeting_id = EXCLUDED.active_meeting_id,
    active_task_id = EXCLUDED.active_task_id,
    active_record_id = EXCLUDED.active_record_id,
    active_shift_id = EXCLUDED.active_shift_id,
    shift_label = EXCLUDED.shift_label,
    on_shift = EXCLUDED.on_shift,
    device_type = EXCLUDED.device_type,
    device_label = EXCLUDED.device_label,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    last_seen_at = now(),
    status_changed_at = CASE
      WHEN public.connect_presence.current_status IS DISTINCT FROM EXCLUDED.current_status THEN now()
      ELSE public.connect_presence.status_changed_at
    END,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_presence_id;

  IF v_previous_status IS DISTINCT FROM v_status::text THEN
    INSERT INTO public.connect_presence_events (
      user_id, staff_id, provider_id, home_id, previous_status, new_status,
      event_type, event_summary, active_channel_id, active_meeting_id,
      active_task_id, active_record_id, ip_address, user_agent, metadata
    )
    VALUES (
      p_user_id, p_staff_id, p_provider_id, p_home_id, v_previous_status, v_status::text,
      'status_changed', 'Presence changed to ' || v_status::text,
      p_active_channel_id, p_active_meeting_id, p_active_task_id, p_active_record_id,
      p_ip_address, p_user_agent, COALESCE(p_metadata,'{}'::jsonb)
    );
  END IF;

  RETURN v_presence_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_connect_presence_board AS
SELECT
  p.*,
  c.name AS active_channel_name,
  m.title AS active_meeting_title,
  t.title AS active_task_title,
  r.title AS active_record_title,
  CASE
    WHEN p.last_seen_at < now() - interval '10 minutes' THEN 'stale'
    WHEN p.current_status = 'offline' THEN 'offline'
    WHEN p.current_status IN ('incident_response','handover','supervision','meeting') THEN 'engaged'
    WHEN p.on_shift THEN 'on_shift'
    ELSE 'available'
  END AS operational_state
FROM public.connect_presence p
LEFT JOIN public.connect_channels c ON c.id = p.active_channel_id
LEFT JOIN public.connect_meetings m ON m.id = p.active_meeting_id
LEFT JOIN public.universal_tasks t ON t.id = p.active_task_id
LEFT JOIN public.universal_records r ON r.id = p.active_record_id;

CREATE OR REPLACE VIEW public.vw_home_presence_dashboard AS
SELECT
  home_id,
  count(*) FILTER (WHERE last_seen_at >= now() - interval '10 minutes' AND current_status <> 'offline') AS online_staff,
  count(*) FILTER (WHERE on_shift = true) AS on_shift_staff,
  count(*) FILTER (WHERE current_status = 'available' AND last_seen_at >= now() - interval '10 minutes') AS available_staff,
  count(*) FILTER (WHERE current_status = 'incident_response') AS incident_response_staff,
  count(*) FILTER (WHERE current_status = 'handover') AS handover_staff,
  count(*) FILTER (WHERE current_status = 'supervision') AS supervision_staff,
  count(*) FILTER (WHERE current_status = 'meeting') AS meeting_staff,
  max(last_seen_at) AS latest_seen_at
FROM public.connect_presence
GROUP BY home_id;
