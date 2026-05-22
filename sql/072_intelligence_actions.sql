-- Stage 3: Intelligence action loop and manager oversight workflow
-- Proposed actions for human-in-the-loop review — not automatic decisions.

CREATE TABLE IF NOT EXISTS public.intelligence_actions (
  id BIGSERIAL PRIMARY KEY,
  home_id TEXT NULL,
  child_id TEXT NULL,
  staff_id TEXT NULL,
  source_finding_id TEXT NULL,
  source_finding_type TEXT NULL,
  source_service TEXT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'proposed',
  owner_role TEXT NULL,
  owner_user_id TEXT NULL,
  due_date TIMESTAMPTZ NULL,
  linked_record_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  regulatory_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  sccif_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_standard_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NULL,
  suggested_next_step TEXT NULL,
  manager_decision TEXT NULL,
  manager_decision_reason TEXT NULL,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_intelligence_actions_home_id
  ON public.intelligence_actions(home_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_child_id
  ON public.intelligence_actions(child_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_staff_id
  ON public.intelligence_actions(staff_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_status
  ON public.intelligence_actions(status);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_priority
  ON public.intelligence_actions(priority);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_created_at
  ON public.intelligence_actions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.intelligence_oversight_reviews (
  id BIGSERIAL PRIMARY KEY,
  home_id TEXT NULL,
  child_id TEXT NULL,
  staff_id TEXT NULL,
  review_type TEXT NOT NULL,
  source TEXT NULL,
  finding_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision TEXT NOT NULL,
  decision_reason TEXT NULL,
  manager_notes TEXT NULL,
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_oversight_reviews_home_id
  ON public.intelligence_oversight_reviews(home_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_oversight_reviews_child_id
  ON public.intelligence_oversight_reviews(child_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_oversight_reviews_created_at
  ON public.intelligence_oversight_reviews(created_at DESC);
