-- IndiCare Universal Notifications and Task Queue Schema
-- Adds operational alerting/task workflow for records, safeguarding, reviews and evidence gaps.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'universal_task_priority') THEN
    CREATE TYPE universal_task_priority AS ENUM ('low','normal','medium','high','critical');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'universal_task_status') THEN
    CREATE TYPE universal_task_status AS ENUM ('open','in_progress','waiting','completed','cancelled','overdue');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'universal_notification_status') THEN
    CREATE TYPE universal_notification_status AS ENUM ('unread','read','dismissed','actioned');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.universal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,
  attachment_id uuid NULL REFERENCES public.universal_record_attachments(id) ON DELETE SET NULL,

  task_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text NULL,
  recommended_action text NULL,

  priority universal_task_priority NOT NULL DEFAULT 'normal',
  status universal_task_status NOT NULL DEFAULT 'open',

  due_at timestamptz NULL,
  completed_at timestamptz NULL,
  completed_by int4 NULL,

  assigned_to int4 NULL,
  assigned_role text NULL,

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  inspection_relevant boolean NOT NULL DEFAULT false,
  manager_review_related boolean NOT NULL DEFAULT false,

  source_table text NULL,
  source_id text NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_universal_tasks_record ON public.universal_tasks(record_id);
CREATE INDEX IF NOT EXISTS idx_universal_tasks_home ON public.universal_tasks(home_id);
CREATE INDEX IF NOT EXISTS idx_universal_tasks_child ON public.universal_tasks(young_person_id);
CREATE INDEX IF NOT EXISTS idx_universal_tasks_staff ON public.universal_tasks(staff_id);
CREATE INDEX IF NOT EXISTS idx_universal_tasks_status ON public.universal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_universal_tasks_priority ON public.universal_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_universal_tasks_due ON public.universal_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_universal_tasks_assigned_to ON public.universal_tasks(assigned_to);

CREATE TABLE IF NOT EXISTS public.universal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4 NULL,
  home_id int4 NULL,
  young_person_id int4 NULL,
  staff_id int4 NULL,
  adult_id int4 NULL,

  user_id int4 NULL,
  role text NULL,

  task_id uuid NULL REFERENCES public.universal_tasks(id) ON DELETE CASCADE,
  record_id uuid NULL REFERENCES public.universal_records(id) ON DELETE SET NULL,
  attachment_id uuid NULL REFERENCES public.universal_record_attachments(id) ON DELETE SET NULL,

  notification_type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NULL,

  priority universal_task_priority NOT NULL DEFAULT 'normal',
  status universal_notification_status NOT NULL DEFAULT 'unread',

  action_url text NULL,
  action_label text NULL,

  read_at timestamptz NULL,
  dismissed_at timestamptz NULL,
  actioned_at timestamptz NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_universal_notifications_user ON public.universal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_universal_notifications_role ON public.universal_notifications(role);
CREATE INDEX IF NOT EXISTS idx_universal_notifications_home ON public.universal_notifications(home_id);
CREATE INDEX IF NOT EXISTS idx_universal_notifications_status ON public.universal_notifications(status);
CREATE INDEX IF NOT EXISTS idx_universal_notifications_priority ON public.universal_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_universal_notifications_created ON public.universal_notifications(created_at DESC);

CREATE OR REPLACE FUNCTION public.universal_create_task_for_record(
  p_record_id uuid,
  p_task_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_recommended_action text DEFAULT NULL,
  p_priority text DEFAULT 'normal',
  p_due_at timestamptz DEFAULT NULL,
  p_assigned_to int4 DEFAULT NULL,
  p_assigned_role text DEFAULT NULL,
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_task_id uuid;
  v_record public.universal_records%ROWTYPE;
  v_priority universal_task_priority;
BEGIN
  SELECT * INTO v_record FROM public.universal_records WHERE id = p_record_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Universal record not found: %', p_record_id;
  END IF;

  v_priority := CASE
    WHEN p_priority IN ('low','normal','medium','high','critical') THEN p_priority::universal_task_priority
    ELSE 'normal'::universal_task_priority
  END;

  INSERT INTO public.universal_tasks (
    provider_id, home_id, young_person_id, staff_id, adult_id,
    record_id, task_type, title, description, recommended_action,
    priority, due_at, assigned_to, assigned_role,
    safeguarding_relevant, inspection_relevant, manager_review_related,
    source_table, source_id, created_by, metadata
  )
  VALUES (
    v_record.provider_id, v_record.home_id, v_record.young_person_id, v_record.staff_id, v_record.adult_id,
    p_record_id, COALESCE(p_task_type,'general'), p_title, p_description, p_recommended_action,
    v_priority, p_due_at, p_assigned_to, p_assigned_role,
    COALESCE(v_record.safeguarding_relevant,false), COALESCE(v_record.inspection_relevant,false), COALESCE(v_record.manager_review_required,false),
    v_record.source_table, v_record.source_id, p_created_by, COALESCE(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_task_id;

  INSERT INTO public.universal_notifications (
    provider_id, home_id, young_person_id, staff_id, adult_id,
    user_id, role, task_id, record_id, notification_type, title, message, priority,
    action_url, action_label, metadata
  )
  VALUES (
    v_record.provider_id, v_record.home_id, v_record.young_person_id, v_record.staff_id, v_record.adult_id,
    p_assigned_to, p_assigned_role, v_task_id, p_record_id, p_task_type, p_title, p_description, v_priority,
    '/os-command', 'Open task', COALESCE(p_metadata,'{}'::jsonb)
  );

  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_universal_task_queue AS
SELECT
  t.*,
  r.title AS record_title,
  r.record_type,
  r.record_category,
  CASE
    WHEN t.status IN ('completed','cancelled') THEN t.status::text
    WHEN t.due_at IS NOT NULL AND t.due_at < now() THEN 'overdue'
    ELSE t.status::text
  END AS queue_state
FROM public.universal_tasks t
LEFT JOIN public.universal_records r ON r.id = t.record_id
ORDER BY
  CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
  COALESCE(t.due_at, t.created_at) ASC;

CREATE OR REPLACE VIEW public.vw_universal_notification_feed AS
SELECT
  n.*,
  t.title AS task_title,
  r.title AS record_title,
  r.record_type,
  r.record_category
FROM public.universal_notifications n
LEFT JOIN public.universal_tasks t ON t.id = n.task_id
LEFT JOIN public.universal_records r ON r.id = n.record_id
ORDER BY
  CASE n.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
  n.created_at DESC;

CREATE OR REPLACE VIEW public.vw_home_task_dashboard AS
SELECT
  home_id,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting')) AS open_tasks,
  count(*) FILTER (WHERE status IN ('open','in_progress','waiting') AND due_at < now()) AS overdue_tasks,
  count(*) FILTER (WHERE priority IN ('high','critical') AND status IN ('open','in_progress','waiting')) AS high_priority_tasks,
  count(*) FILTER (WHERE safeguarding_relevant AND status IN ('open','in_progress','waiting')) AS safeguarding_tasks,
  count(*) FILTER (WHERE manager_review_related AND status IN ('open','in_progress','waiting')) AS manager_review_tasks,
  max(created_at) AS latest_task_at
FROM public.universal_tasks
GROUP BY home_id;
