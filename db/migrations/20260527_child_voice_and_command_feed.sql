-- IndiCare OS missing schema for canonical child workspace wiring
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.child_voice_entries (
    id BIGSERIAL PRIMARY KEY,
    provider_id INTEGER,
    home_id INTEGER,
    young_person_id INTEGER NOT NULL,
    source_table TEXT,
    source_id BIGINT,
    voice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    voice_text TEXT NOT NULL,
    context TEXT,
    how_voice_influenced_care TEXT,
    recorded_by INTEGER,
    linked_plan_id BIGINT,
    linked_review_id BIGINT,
    confidentiality_level TEXT NOT NULL DEFAULT 'standard',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_voice_entries_child
    ON public.child_voice_entries (young_person_id, voice_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_child_voice_entries_home
    ON public.child_voice_entries (home_id, voice_date DESC)
    WHERE home_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_child_voice_entries_source
    ON public.child_voice_entries (source_table, source_id)
    WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

COMMENT ON TABLE public.child_voice_entries IS
    'Canonical child voice entries for IndiCare OS. Use this when child voice is recorded directly rather than embedded in a daily note, incident, plan or review.';

COMMENT ON COLUMN public.child_voice_entries.how_voice_influenced_care IS
    'Explains how the child voice changed a plan, decision, review, record, action or staff response.';

CREATE OR REPLACE FUNCTION public.os_command_live_feed(
    p_home_id INTEGER DEFAULT NULL,
    p_young_person_id INTEGER DEFAULT NULL,
    p_domain TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    feed_id TEXT,
    command_item_id UUID,
    provider_id INTEGER,
    home_id INTEGER,
    young_person_id INTEGER,
    staff_id INTEGER,
    domain TEXT,
    priority TEXT,
    status TEXT,
    title TEXT,
    summary TEXT,
    recommended_action TEXT,
    source_table TEXT,
    source_id TEXT,
    due_at TIMESTAMPTZ,
    sccif_area TEXT,
    regulation_refs TEXT[],
    evidence_refs JSONB,
    ai_generated BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        ('command:' || id::text) AS feed_id,
        id AS command_item_id,
        provider_id,
        home_id,
        young_person_id,
        staff_id,
        domain::text,
        priority::text,
        status::text,
        title,
        summary,
        recommended_action,
        source_table,
        source_id,
        due_at,
        sccif_area,
        regulation_refs,
        evidence_refs,
        ai_generated,
        created_at,
        updated_at
    FROM public.os_command_items
    WHERE (p_home_id IS NULL OR home_id = p_home_id)
      AND (p_young_person_id IS NULL OR young_person_id = p_young_person_id)
      AND (p_domain IS NULL OR domain::text = p_domain)
      AND (p_priority IS NULL OR priority::text = p_priority)
      AND status::text NOT IN ('completed', 'dismissed', 'void')
    ORDER BY
      CASE priority::text
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END,
      due_at ASC NULLS LAST,
      updated_at DESC NULLS LAST,
      created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$$;

COMMENT ON FUNCTION public.os_command_live_feed(INTEGER, INTEGER, TEXT, TEXT, INTEGER) IS
    'Stable OS command feed wrapper used by child workspace and command centre routes. Reads from os_command_items.';
