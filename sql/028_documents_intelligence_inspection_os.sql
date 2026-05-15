CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS document_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  label TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT,
  UNIQUE (template_id, field_id)
);

CREATE TABLE IF NOT EXISTS child_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  child_id TEXT,
  home_id TEXT,
  provider_id TEXT,
  title TEXT NOT NULL,
  editable_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS child_document_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  field_id TEXT NOT NULL,
  value TEXT,
  confidence_score NUMERIC(5,2),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS child_document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  file_name TEXT,
  file_type TEXT,
  storage_key TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'uploaded',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS child_document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  upload_id UUID,
  extracted_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(5,2),
  requires_human_review BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS child_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  link_type TEXT NOT NULL,
  linked_table TEXT,
  linked_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS child_document_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  actor_role TEXT,
  comments TEXT,
  evidence_reviewed JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted_for_review',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS document_decision_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  suggestion JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision TEXT,
  rationale TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'recorded',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS annex_a_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id TEXT,
  provider_id TEXT,
  draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS annex_a_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annex_a_id UUID,
  section_id TEXT NOT NULL,
  section_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS safeguarding_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  step_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS safeguarding_flow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  threshold TEXT,
  flow_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS safeguarding_flow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_instance_id UUID,
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  due_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS chronology_pattern_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  pattern_type TEXT NOT NULL,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS contextual_safeguarding_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  map_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS emotional_wellbeing_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  event_at TIMESTAMPTZ,
  timeline_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS workforce_culture_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id TEXT,
  flag_type TEXT NOT NULL,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS inspection_readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id TEXT,
  provider_id TEXT,
  snapshot_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS child_journey_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  summary_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS placement_stability_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  indicator_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS child_friendly_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  output_type TEXT NOT NULL,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS provider_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT,
  snapshot_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS relational_intelligence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id TEXT,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id TEXT,
  notification_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'unread',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_type TEXT,
  escalation_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS forensic_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_role TEXT,
  resource_type TEXT,
  resource_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'recorded',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  permission_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS policy_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL,
  version TEXT,
  policy_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID,
  staff_id TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS qa_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type TEXT NOT NULL,
  audit_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS smart_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indexed_text TEXT,
  index_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS meetings_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type TEXT,
  meeting_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS external_professional_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_type TEXT,
  link_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source_table TEXT,
  source_id TEXT
);

CREATE TABLE IF NOT EXISTS outcomes_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_type TEXT,
  analytics_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  source_table TEXT,
  source_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_child_documents_scope ON child_documents (provider_id, home_id, child_id, status);
CREATE INDEX IF NOT EXISTS idx_child_document_links_doc ON child_document_links (document_id, link_type);
CREATE INDEX IF NOT EXISTS idx_forensic_audit_events_resource ON forensic_audit_events (resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_search_index_source ON smart_search_index (source_table, source_id);
