-- IndiCare OS Command operational feed helpers
-- This migration extends OS Command with reusable helper functions and seed command rules.

CREATE TABLE IF NOT EXISTS public.os_command_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  domain os_command_domain NOT NULL,
  priority os_command_priority NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  recommended_action text,
  sccif_area text CHECK (sccif_area IS NULL OR sccif_area IN ('children_experiences_progress','helped_and_protected','leadership_management')),
  regulation_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.os_command_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_item_id uuid NOT NULL REFERENCES public.os_command_items(id) ON DELETE CASCADE,
  notify_user_id int4,
  notify_staff_id int4,
  channel text NOT NULL DEFAULT 'in_app',
  subject text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_command_rules_enabled ON public.os_command_rules(enabled, domain, priority);
CREATE INDEX IF NOT EXISTS idx_os_command_notifications_status ON public.os_command_notifications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_os_command_notifications_item ON public.os_command_notifications(command_item_id);

INSERT INTO public.os_command_rules (
  rule_key, domain, priority, title, description, recommended_action, sccif_area, regulation_refs
) VALUES
  (
    'incident_manager_review',
    'safeguarding',
    'high',
    'Incident requires manager review',
    'Any incident should be reviewed promptly by a senior/manager and linked to risk, chronology and safeguarding evidence.',
    'Review incident, update risk assessment if needed, decide whether Regulation 40 applies, and record management oversight.',
    'helped_and_protected',
    ARRAY['Regulation 40','SCCIF helped and protected']
  ),
  (
    'missing_episode_review',
    'missing_from_care',
    'critical',
    'Missing episode requires review',
    'A missing episode requires immediate oversight, notifications, return-home interview tracking and risk review.',
    'Confirm police/social worker notifications, record return-home interview, update missing risk plan and chronology.',
    'helped_and_protected',
    ARRAY['Regulation 40','Missing from care','SCCIF helped and protected']
  ),
  (
    'daily_note_gap',
    'daily_care',
    'medium',
    'Daily note gap detected',
    'Daily records should evidence children experiences, routines, progress, concerns and staff response.',
    'Ask the shift lead to complete or review missing daily records and add management oversight where needed.',
    'children_experiences_progress',
    ARRAY['SCCIF experiences and progress']
  ),
  (
    'medication_gap',
    'medication',
    'high',
    'Medication record needs review',
    'Medication gaps or errors need manager review, action and evidence of learning.',
    'Check MAR, record reason/action, consider health advice, notify relevant professionals if required.',
    'helped_and_protected',
    ARRAY['Medication','Health','SCCIF helped and protected']
  ),
  (
    'risk_review_due',
    'risk',
    'high',
    'Risk assessment review due',
    'Risk assessments should reflect current presentation, incidents, missing episodes and safeguarding information.',
    'Review the assessment, update controls, record child voice where appropriate and confirm manager sign-off.',
    'helped_and_protected',
    ARRAY['Risk assessment','SCCIF helped and protected']
  ),
  (
    'staff_training_expiry',
    'workforce',
    'medium',
    'Staff training expiry requires action',
    'Training gaps affect safer staffing, quality of care and leadership oversight.',
    'Book refresher training, update the training matrix and consider deployment restrictions if mandatory training has expired.',
    'leadership_management',
    ARRAY['Workforce','SCCIF leadership and management']
  ),
  (
    'reg44_action_overdue',
    'reg44',
    'high',
    'Regulation 44 action overdue',
    'Regulation 44 findings should be tracked to completion and evidenced.',
    'Review overdue action, assign owner, update response and attach evidence of completion.',
    'leadership_management',
    ARRAY['Regulation 44','SCCIF leadership and management']
  ),
  (
    'reg45_review_due',
    'reg45',
    'high',
    'Regulation 45 review due',
    'The manager quality of care review should evidence outcomes, consultation, trends and improvement actions.',
    'Prepare evidence, consult children/staff/professionals, update the review and improvement plan.',
    'leadership_management',
    ARRAY['Regulation 45','SCCIF leadership and management']
  )
ON CONFLICT (rule_key) DO UPDATE SET
  domain = EXCLUDED.domain,
  priority = EXCLUDED.priority,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  recommended_action = EXCLUDED.recommended_action,
  sccif_area = EXCLUDED.sccif_area,
  regulation_refs = EXCLUDED.regulation_refs,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.os_command_create_manual_item(
  p_rule_key text,
  p_provider_id int4 DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_young_person_id int4 DEFAULT NULL,
  p_staff_id int4 DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id int8 DEFAULT NULL,
  p_due_at timestamptz DEFAULT NULL,
  p_created_by int4 DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule public.os_command_rules%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_rule
  FROM public.os_command_rules
  WHERE rule_key = p_rule_key AND enabled = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OS Command rule not found or disabled: %', p_rule_key;
  END IF;

  INSERT INTO public.os_command_items (
    provider_id,
    home_id,
    young_person_id,
    staff_id,
    domain,
    priority,
    status,
    title,
    summary,
    recommended_action,
    source_table,
    source_id,
    due_at,
    sccif_area,
    regulation_refs,
    evidence_refs,
    metadata,
    created_by
  ) VALUES (
    p_provider_id,
    p_home_id,
    p_young_person_id,
    p_staff_id,
    v_rule.domain,
    v_rule.priority,
    'open',
    v_rule.title,
    coalesce(p_summary, v_rule.description),
    v_rule.recommended_action,
    p_source_table,
    p_source_id,
    p_due_at,
    v_rule.sccif_area,
    v_rule.regulation_refs,
    CASE WHEN p_source_table IS NOT NULL AND p_source_id IS NOT NULL
      THEN jsonb_build_array(jsonb_build_object('table', p_source_table, 'id', p_source_id))
      ELSE '[]'::jsonb
    END,
    coalesce(p_metadata, '{}'::jsonb),
    p_created_by
  )
  ON CONFLICT (source_table, source_id, domain, title) DO UPDATE SET
    summary = EXCLUDED.summary,
    recommended_action = EXCLUDED.recommended_action,
    due_at = coalesce(EXCLUDED.due_at, public.os_command_items.due_at),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_command_rule_catalog AS
SELECT
  rule_key,
  domain::text AS domain,
  priority::text AS priority,
  title,
  description,
  recommended_action,
  sccif_area,
  regulation_refs,
  enabled,
  updated_at
FROM public.os_command_rules
ORDER BY domain, priority, title;
