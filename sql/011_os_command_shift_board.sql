-- IndiCare OS Command shift leader board
-- Adds shift-level operational command, handover, task and safety summary foundations.

DO $$ BEGIN
  CREATE TYPE os_shift_status AS ENUM ('planned','active','handover','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_shift_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  shift_date date NOT NULL DEFAULT current_date,
  shift_type text NOT NULL DEFAULT 'day',
  status os_shift_status NOT NULL DEFAULT 'planned',
  shift_lead_user_id int4,
  shift_lead_staff_id int4,
  started_at timestamptz,
  ended_at timestamptz,
  handover_summary text,
  safety_summary text,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (home_id, shift_date, shift_type)
);

CREATE TABLE IF NOT EXISTS public.os_shift_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  shift_session_id uuid REFERENCES public.os_shift_sessions(id) ON DELETE SET NULL,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  young_person_id int4,
  staff_id int4,
  title text NOT NULL,
  summary text,
  priority os_command_priority NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','dismissed','deferred')),
  due_at timestamptz,
  assigned_to_user_id int4,
  assigned_to_staff_id int4,
  completed_by int4,
  completed_at timestamptz,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.os_shift_handover_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  shift_session_id uuid REFERENCES public.os_shift_sessions(id) ON DELETE CASCADE,
  young_person_id int4,
  command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  item_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  details text,
  priority os_command_priority NOT NULL DEFAULT 'medium',
  requires_follow_up boolean NOT NULL DEFAULT false,
  follow_up_command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_shift_sessions_home_date ON public.os_shift_sessions(home_id, shift_date DESC, shift_type);
CREATE INDEX IF NOT EXISTS idx_os_shift_tasks_shift_status ON public.os_shift_tasks(shift_session_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_os_shift_tasks_home_status ON public.os_shift_tasks(home_id, status, priority, due_at);
CREATE INDEX IF NOT EXISTS idx_os_shift_handover_shift ON public.os_shift_handover_items(shift_session_id, priority);

CREATE OR REPLACE FUNCTION public.os_shift_start(
  p_provider_id int4,
  p_home_id int4,
  p_shift_date date DEFAULT current_date,
  p_shift_type text DEFAULT 'day',
  p_shift_lead_user_id int4 DEFAULT NULL,
  p_shift_lead_staff_id int4 DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_shift_sessions (
    provider_id, home_id, shift_date, shift_type, status,
    shift_lead_user_id, shift_lead_staff_id, started_at, created_by
  ) VALUES (
    p_provider_id, p_home_id, coalesce(p_shift_date, current_date), coalesce(p_shift_type, 'day'), 'active',
    p_shift_lead_user_id, p_shift_lead_staff_id, now(), p_created_by
  )
  ON CONFLICT (home_id, shift_date, shift_type) DO UPDATE SET
    status = 'active',
    shift_lead_user_id = coalesce(EXCLUDED.shift_lead_user_id, public.os_shift_sessions.shift_lead_user_id),
    shift_lead_staff_id = coalesce(EXCLUDED.shift_lead_staff_id, public.os_shift_sessions.shift_lead_staff_id),
    started_at = coalesce(public.os_shift_sessions.started_at, now()),
    updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.os_live_emit(
    'command.updated', 'os_shift_sessions', v_id::text, 'Shift started',
    p_provider_id, p_home_id, NULL, p_shift_lead_staff_id,
    jsonb_build_object('shift_date', p_shift_date, 'shift_type', p_shift_type),
    ARRAY['support_worker','senior','manager'], p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_shift_complete_task(
  p_task_id uuid,
  p_user_id int4 DEFAULT NULL,
  p_completion_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_task public.os_shift_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.os_shift_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift task not found: %', p_task_id;
  END IF;

  UPDATE public.os_shift_tasks
  SET status = 'completed', completed_by = p_user_id, completed_at = now(), updated_at = now(),
      metadata = metadata || jsonb_build_object('completion_note', p_completion_note)
  WHERE id = p_task_id;

  IF v_task.command_item_id IS NOT NULL THEN
    PERFORM public.os_command_complete_with_chronology(
      v_task.command_item_id,
      p_user_id,
      coalesce(p_completion_note, 'Completed from shift board'),
      'Completed as part of shift operational workflow.'
    );
  END IF;

  PERFORM public.os_live_emit(
    'command.completed', 'os_shift_tasks', p_task_id::text, v_task.title,
    v_task.provider_id, v_task.home_id, v_task.young_person_id, v_task.staff_id,
    jsonb_build_object('completion_note', p_completion_note),
    ARRAY['support_worker','senior','manager'], p_user_id
  );

  RETURN p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_shift_generate_from_commands(
  p_shift_session_id uuid,
  p_user_id int4 DEFAULT NULL
)
RETURNS int4
LANGUAGE plpgsql
AS $$
DECLARE
  v_shift public.os_shift_sessions%ROWTYPE;
  v_count int4 := 0;
BEGIN
  SELECT * INTO v_shift FROM public.os_shift_sessions WHERE id = p_shift_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift session not found: %', p_shift_session_id;
  END IF;

  INSERT INTO public.os_shift_tasks (
    provider_id, home_id, shift_session_id, command_item_id, young_person_id, staff_id,
    title, summary, priority, due_at, created_by, metadata
  )
  SELECT
    i.provider_id,
    i.home_id,
    p_shift_session_id,
    i.id,
    i.young_person_id,
    i.staff_id,
    i.title,
    coalesce(i.recommended_action, i.summary),
    i.priority,
    i.due_at,
    p_user_id,
    jsonb_build_object('generated_from', 'os_command_items')
  FROM public.os_command_items i
  WHERE i.home_id = v_shift.home_id
    AND i.status IN ('open','in_progress','waiting')
    AND i.domain IN ('safeguarding','missing_from_care','medication','daily_care','risk','handover','home_operations')
    AND NOT EXISTS (
      SELECT 1 FROM public.os_shift_tasks t
      WHERE t.shift_session_id = p_shift_session_id
        AND t.command_item_id = i.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_shift_leader_board AS
WITH active_shift AS (
  SELECT DISTINCT ON (home_id)
    *
  FROM public.os_shift_sessions
  WHERE status IN ('active','handover')
  ORDER BY home_id, started_at DESC NULLS LAST, created_at DESC
), task_summary AS (
  SELECT
    shift_session_id,
    count(*) FILTER (WHERE status IN ('open','in_progress')) AS open_tasks,
    count(*) FILTER (WHERE status IN ('open','in_progress') AND priority='critical') AS critical_tasks,
    count(*) FILTER (WHERE status IN ('open','in_progress') AND priority='high') AS high_tasks,
    count(*) FILTER (WHERE status IN ('open','in_progress') AND due_at < now()) AS overdue_tasks
  FROM public.os_shift_tasks
  GROUP BY shift_session_id
), handover_summary AS (
  SELECT
    shift_session_id,
    count(*) AS handover_items,
    count(*) FILTER (WHERE requires_follow_up = true) AS follow_up_items
  FROM public.os_shift_handover_items
  GROUP BY shift_session_id
)
SELECT
  s.id AS shift_session_id,
  s.provider_id,
  s.home_id,
  s.shift_date,
  s.shift_type,
  s.status::text AS shift_status,
  s.shift_lead_user_id,
  s.shift_lead_staff_id,
  s.started_at,
  s.ended_at,
  coalesce(t.open_tasks, 0) AS open_tasks,
  coalesce(t.critical_tasks, 0) AS critical_tasks,
  coalesce(t.high_tasks, 0) AS high_tasks,
  coalesce(t.overdue_tasks, 0) AS overdue_tasks,
  coalesce(h.handover_items, 0) AS handover_items,
  coalesce(h.follow_up_items, 0) AS follow_up_items,
  CASE
    WHEN coalesce(t.critical_tasks, 0) > 0 THEN 'critical'
    WHEN coalesce(t.overdue_tasks, 0) > 0 OR coalesce(t.high_tasks, 0) > 3 THEN 'high'
    WHEN coalesce(t.open_tasks, 0) > 0 THEN 'active'
    ELSE 'stable'
  END AS shift_state
FROM active_shift s
LEFT JOIN task_summary t ON t.shift_session_id = s.id
LEFT JOIN handover_summary h ON h.shift_session_id = s.id;

CREATE OR REPLACE VIEW public.vw_os_shift_task_board AS
SELECT
  t.id,
  t.provider_id,
  t.home_id,
  t.shift_session_id,
  t.command_item_id,
  t.young_person_id,
  t.staff_id,
  t.title,
  t.summary,
  t.priority::text AS priority,
  t.status,
  t.due_at,
  t.assigned_to_user_id,
  t.assigned_to_staff_id,
  t.completed_by,
  t.completed_at,
  t.created_at,
  CASE
    WHEN t.status IN ('open','in_progress') AND t.due_at < now() THEN 'overdue'
    WHEN t.priority = 'critical' THEN 'critical'
    WHEN t.priority = 'high' THEN 'high'
    ELSE t.status
  END AS task_state
FROM public.os_shift_tasks t;
