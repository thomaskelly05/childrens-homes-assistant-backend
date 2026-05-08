-- IndiCare OS Command live updates and AI recommendation layer
-- Adds event streaming tables, notification queue hooks and assistant recommendation governance.

DO $$ BEGIN
  CREATE TYPE os_live_event_type AS ENUM (
    'command.created','command.updated','command.completed','command.dismissed',
    'chronology.created','reg40.created','missing.created','missing.returned',
    'medication.escalated','daily_gap.created','workforce.issue','ai.recommendation.created','ai.recommendation.approved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE os_ai_recommendation_status AS ENUM ('draft','pending_review','approved','rejected','converted','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.os_live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  young_person_id int4,
  staff_id int4,
  event_type os_live_event_type NOT NULL,
  entity_table text NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  visible_to_roles text[] NOT NULL DEFAULT ARRAY['senior','manager','responsible_individual'],
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.os_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id int4,
  home_id int4,
  young_person_id int4,
  staff_id int4,
  source_table text,
  source_id int8,
  domain os_command_domain NOT NULL,
  priority os_command_priority NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  summary text NOT NULL,
  recommended_action text,
  confidence numeric(5,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status os_ai_recommendation_status NOT NULL DEFAULT 'draft',
  model_name text,
  prompt_ref text,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  safety_notes text,
  reviewer_id int4,
  reviewed_at timestamptz,
  review_rationale text,
  converted_command_item_id uuid REFERENCES public.os_command_items(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_by int4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_os_live_events_home_created ON public.os_live_events(home_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_live_events_type_created ON public.os_live_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_ai_recommendations_home_status ON public.os_ai_recommendations(home_id, status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_ai_recommendations_source ON public.os_ai_recommendations(source_table, source_id);

CREATE OR REPLACE FUNCTION public.os_live_emit(
  p_event_type os_live_event_type,
  p_entity_table text,
  p_entity_id text,
  p_title text,
  p_provider_id int4 DEFAULT NULL,
  p_home_id int4 DEFAULT NULL,
  p_young_person_id int4 DEFAULT NULL,
  p_staff_id int4 DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_visible_to_roles text[] DEFAULT ARRAY['senior','manager','responsible_individual'],
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_live_events (
    provider_id, home_id, young_person_id, staff_id, event_type, entity_table, entity_id,
    title, payload, visible_to_roles, created_by
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_staff_id, p_event_type, p_entity_table, p_entity_id,
    p_title, coalesce(p_payload, '{}'::jsonb), coalesce(p_visible_to_roles, ARRAY['senior','manager','responsible_individual']), p_created_by
  ) RETURNING id INTO v_id;

  PERFORM pg_notify('os_command_events', json_build_object(
    'id', v_id,
    'event_type', p_event_type,
    'entity_table', p_entity_table,
    'entity_id', p_entity_id,
    'home_id', p_home_id,
    'young_person_id', p_young_person_id,
    'title', p_title
  )::text);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_command_item_live_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.os_live_emit(
      'command.created', 'os_command_items', NEW.id::text, NEW.title,
      NEW.provider_id, NEW.home_id, NEW.young_person_id, NEW.staff_id,
      to_jsonb(NEW), ARRAY['senior','manager','responsible_individual'], NEW.created_by
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      PERFORM public.os_live_emit(
        'command.completed', 'os_command_items', NEW.id::text, NEW.title,
        NEW.provider_id, NEW.home_id, NEW.young_person_id, NEW.staff_id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
        ARRAY['senior','manager','responsible_individual'], NEW.completed_by
      );
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'dismissed' THEN
      PERFORM public.os_live_emit(
        'command.dismissed', 'os_command_items', NEW.id::text, NEW.title,
        NEW.provider_id, NEW.home_id, NEW.young_person_id, NEW.staff_id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
        ARRAY['senior','manager','responsible_individual'], NEW.dismissed_by
      );
    ELSE
      PERFORM public.os_live_emit(
        'command.updated', 'os_command_items', NEW.id::text, NEW.title,
        NEW.provider_id, NEW.home_id, NEW.young_person_id, NEW.staff_id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
        ARRAY['senior','manager','responsible_individual'], NULL
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_os_command_item_live ON public.os_command_items;
CREATE TRIGGER trg_os_command_item_live
AFTER INSERT OR UPDATE ON public.os_command_items
FOR EACH ROW EXECUTE FUNCTION public.os_command_item_live_trigger();

CREATE OR REPLACE FUNCTION public.os_ai_create_recommendation(
  p_provider_id int4,
  p_home_id int4,
  p_young_person_id int4,
  p_domain os_command_domain,
  p_priority os_command_priority,
  p_title text,
  p_summary text,
  p_recommended_action text DEFAULT NULL,
  p_confidence numeric DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id int8 DEFAULT NULL,
  p_source_refs jsonb DEFAULT '[]'::jsonb,
  p_model_name text DEFAULT NULL,
  p_prompt_ref text DEFAULT NULL,
  p_safety_notes text DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.os_ai_recommendations (
    provider_id, home_id, young_person_id, domain, priority, title, summary, recommended_action,
    confidence, source_table, source_id, source_refs, model_name, prompt_ref, safety_notes,
    status, created_by, expires_at
  ) VALUES (
    p_provider_id, p_home_id, p_young_person_id, p_domain, p_priority, p_title, p_summary, p_recommended_action,
    p_confidence, p_source_table, p_source_id, coalesce(p_source_refs, '[]'::jsonb), p_model_name, p_prompt_ref, p_safety_notes,
    'pending_review', p_created_by, now() + interval '14 days'
  ) RETURNING id INTO v_id;

  PERFORM public.os_live_emit(
    'ai.recommendation.created', 'os_ai_recommendations', v_id::text, p_title,
    p_provider_id, p_home_id, p_young_person_id, NULL,
    jsonb_build_object('priority', p_priority, 'domain', p_domain, 'confidence', p_confidence),
    ARRAY['senior','manager','responsible_individual'], p_created_by
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.os_ai_approve_recommendation(
  p_recommendation_id uuid,
  p_reviewer_id int4,
  p_rationale text DEFAULT NULL,
  p_convert_to_command boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_rec public.os_ai_recommendations%ROWTYPE;
  v_command_id uuid;
BEGIN
  SELECT * INTO v_rec FROM public.os_ai_recommendations WHERE id = p_recommendation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI recommendation not found: %', p_recommendation_id;
  END IF;

  UPDATE public.os_ai_recommendations
  SET status = 'approved', reviewer_id = p_reviewer_id, reviewed_at = now(), review_rationale = p_rationale, updated_at = now()
  WHERE id = p_recommendation_id;

  IF p_convert_to_command THEN
    INSERT INTO public.os_command_items (
      provider_id, home_id, young_person_id, domain, priority, status, title, summary,
      recommended_action, source_table, source_id, due_at, sccif_area, regulation_refs,
      evidence_refs, ai_generated, created_by, metadata
    ) VALUES (
      v_rec.provider_id, v_rec.home_id, v_rec.young_person_id, v_rec.domain, v_rec.priority, 'open',
      v_rec.title, v_rec.summary, v_rec.recommended_action, v_rec.source_table, v_rec.source_id,
      now() + interval '24 hours',
      CASE
        WHEN v_rec.domain IN ('safeguarding','missing_from_care','risk','medication') THEN 'helped_and_protected'
        WHEN v_rec.domain IN ('quality','reg40','reg44','reg45','ofsted','workforce') THEN 'leadership_management'
        ELSE 'children_experiences_progress'
      END,
      ARRAY['AI reviewed recommendation'],
      v_rec.source_refs,
      true,
      p_reviewer_id,
      jsonb_build_object('ai_recommendation_id', p_recommendation_id, 'review_rationale', p_rationale)
    ) RETURNING id INTO v_command_id;

    UPDATE public.os_ai_recommendations
    SET status = 'converted', converted_command_item_id = v_command_id, updated_at = now()
    WHERE id = p_recommendation_id;
  END IF;

  PERFORM public.os_live_emit(
    'ai.recommendation.approved', 'os_ai_recommendations', p_recommendation_id::text, v_rec.title,
    v_rec.provider_id, v_rec.home_id, v_rec.young_person_id, NULL,
    jsonb_build_object('converted_command_item_id', v_command_id, 'rationale', p_rationale),
    ARRAY['senior','manager','responsible_individual'], p_reviewer_id
  );

  RETURN coalesce(v_command_id, p_recommendation_id);
END;
$$;

CREATE OR REPLACE VIEW public.vw_os_live_event_stream AS
SELECT
  id,
  provider_id,
  home_id,
  young_person_id,
  staff_id,
  event_type::text AS event_type,
  entity_table,
  entity_id,
  title,
  payload,
  visible_to_roles,
  created_by,
  created_at
FROM public.os_live_events
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.vw_os_ai_recommendation_board AS
SELECT
  id,
  provider_id,
  home_id,
  young_person_id,
  domain::text AS domain,
  priority::text AS priority,
  status::text AS status,
  title,
  summary,
  recommended_action,
  confidence,
  source_table,
  source_id,
  reviewer_id,
  reviewed_at,
  converted_command_item_id,
  expires_at,
  created_at,
  updated_at
FROM public.os_ai_recommendations
WHERE status IN ('pending_review','approved','converted')
ORDER BY
  CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
  created_at DESC;
