-- First-class operational domains for safeguarding, missing episodes and return-home interviews.
-- These tables store authored operational state; chronology and replay remain the authoritative truth plane.

CREATE TABLE IF NOT EXISTS public.safeguarding_domain_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  title text NOT NULL,
  concern_summary text NOT NULL,
  concern_category text NOT NULL DEFAULT 'safeguarding',
  lifecycle_state text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_state IN ('draft','submitted','manager_review','action_required','escalated','external_notification','monitoring','resolved','archived')),
  severity text NOT NULL DEFAULT 'high' CHECK (severity IN ('low','medium','high','critical')),
  child_voice text,
  immediate_actions text,
  external_notification_required boolean NOT NULL DEFAULT false,
  external_notification_at timestamptz,
  review_due_at timestamptz,
  resolved_at timestamptz,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_action_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  chronology_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  replay_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  updated_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.missing_episode_domain_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  lifecycle_state text NOT NULL DEFAULT 'reported_missing'
    CHECK (lifecycle_state IN ('reported_missing','police_notified','return_pending','returned','RHI_required','RHI_completed','closed')),
  missing_from timestamptz NOT NULL,
  returned_at timestamptz,
  return_home_interview_due_at timestamptz,
  return_home_interview_completed_at timestamptz,
  last_seen_location text,
  circumstances text NOT NULL,
  risk_level text NOT NULL DEFAULT 'high' CHECK (risk_level IN ('low','medium','high','critical')),
  police_reference text,
  police_notified_at timestamptz,
  safeguarding_link_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_action_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  chronology_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  replay_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  updated_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.return_home_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4 NOT NULL,
  young_person_id int4 NOT NULL,
  missing_episode_id uuid NOT NULL REFERENCES public.missing_episode_domain_records(id) ON DELETE CASCADE,
  lifecycle_state text NOT NULL DEFAULT 'completed'
    CHECK (lifecycle_state IN ('draft','completed','manager_review','linked_to_safeguarding','archived')),
  interview_at timestamptz NOT NULL,
  child_voice text NOT NULL,
  push_factors text,
  pull_factors text,
  what_helped text,
  follow_up_required text,
  safeguarding_link_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  chronology_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  replay_event_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_safeguarding_domain_home_state
  ON public.safeguarding_domain_records(home_id, lifecycle_state, review_due_at);
CREATE INDEX IF NOT EXISTS idx_safeguarding_domain_child_created
  ON public.safeguarding_domain_records(young_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missing_domain_home_state
  ON public.missing_episode_domain_records(home_id, lifecycle_state, missing_from DESC);
CREATE INDEX IF NOT EXISTS idx_missing_domain_child_missing
  ON public.missing_episode_domain_records(young_person_id, missing_from DESC);
CREATE INDEX IF NOT EXISTS idx_rhi_missing_episode
  ON public.return_home_interviews(missing_episode_id, interview_at DESC);
