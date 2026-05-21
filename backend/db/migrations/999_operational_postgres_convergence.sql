-- IndiCare operational Postgres convergence
-- Non-destructive migration. Creates canonical pull-through tables/views and
-- backfills chronology from existing live records where present. Does not add
-- fake/demo children or records.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.young_people (
    id BIGSERIAL PRIMARY KEY,
    home_id BIGINT,
    provider_id BIGINT,
    first_name TEXT,
    last_name TEXT,
    preferred_name TEXT,
    display_name TEXT,
    date_of_birth DATE,
    age INTEGER,
    gender TEXT,
    admission_date DATE,
    placement_status TEXT DEFAULT 'active',
    summary_risk_level TEXT DEFAULT 'medium',
    legal_status TEXT,
    legal_status_summary TEXT,
    care_planning TEXT,
    current_placement_plan_status TEXT,
    photo_url TEXT,
    profile_photo_path TEXT,
    placing_authority TEXT,
    social_worker_name TEXT,
    social_worker_email TEXT,
    social_worker_phone TEXT,
    primary_keyworker_id BIGINT,
    key_worker_id BIGINT,
    status TEXT DEFAULT 'active',
    archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.record_workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT,
    workflow_type TEXT NOT NULL,
    record_type TEXT,
    record_id TEXT,
    source_table TEXT,
    source_id TEXT,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    lifecycle_state TEXT DEFAULT 'draft',
    previous_state TEXT,
    event_type TEXT DEFAULT 'record_saved',
    title TEXT,
    summary TEXT,
    child_voice TEXT,
    emotional_presentation TEXT,
    therapeutic_reflection TEXT,
    safeguarding_markers JSONB DEFAULT '[]'::jsonb,
    sccif_area TEXT,
    quality_standard TEXT,
    regulation TEXT,
    evidence_ids JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operational_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    source_table TEXT,
    source_id TEXT,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    previous_state TEXT,
    lifecycle_state TEXT NOT NULL,
    event_type TEXT DEFAULT 'state_changed',
    reason TEXT,
    review_required BOOLEAN DEFAULT FALSE,
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.os_chronology_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    record_type TEXT,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    title TEXT NOT NULL,
    summary TEXT,
    body TEXT,
    event_at TIMESTAMPTZ DEFAULT NOW(),
    lifecycle_state TEXT DEFAULT 'recorded',
    emotional_theme TEXT,
    child_voice_present BOOLEAN DEFAULT FALSE,
    safeguarding_marker BOOLEAN DEFAULT FALSE,
    evidence_ids JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_table, source_id, source_type)
);

CREATE TABLE IF NOT EXISTS public.evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_type TEXT,
    evidence_type TEXT DEFAULT 'record',
    title TEXT,
    summary TEXT,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    chronology_event_id UUID,
    workflow_event_id UUID,
    lifecycle_state TEXT DEFAULT 'linked',
    sccif_area TEXT,
    quality_standard TEXT,
    regulation TEXT,
    inspection_relevance TEXT,
    review_status TEXT DEFAULT 'unreviewed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_table, source_id, evidence_type)
);

CREATE TABLE IF NOT EXISTS public.os_evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_type TEXT,
    evidence_type TEXT DEFAULT 'record',
    title TEXT,
    summary TEXT,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    chronology_event_id UUID,
    workflow_event_id UUID,
    lifecycle_state TEXT DEFAULT 'linked',
    sccif_area TEXT,
    quality_standard TEXT,
    regulation TEXT,
    inspection_relevance TEXT,
    review_status TEXT DEFAULT 'unreviewed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_table, source_id, evidence_type)
);

CREATE TABLE IF NOT EXISTS public.operational_projection_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projection_key TEXT NOT NULL UNIQUE,
    projection_type TEXT NOT NULL,
    domain TEXT NOT NULL,
    young_person_id BIGINT,
    staff_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    payload JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1,
    stale BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.universal_tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    assigned_to_user_id BIGINT,
    staff_id BIGINT,
    young_person_id BIGINT,
    home_id BIGINT,
    provider_id BIGINT,
    source_table TEXT,
    source_type TEXT,
    source_id TEXT,
    sccif_area TEXT,
    regulation TEXT,
    evidence_required JSONB DEFAULT '[]'::jsonb,
    evidence_ids JSONB DEFAULT '[]'::jsonb,
    created_by BIGINT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add safe pull-through columns to existing canonical tables if they exist with
-- older shapes. This avoids destructive rebuilds.
DO $$
DECLARE
    t TEXT;
    c TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['young_people','record_workflow_events','operational_lifecycle_history','os_chronology_events','evidence_links','os_evidence_links','operational_projection_snapshots','universal_tasks'] LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='metadata') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN metadata JSONB DEFAULT ''{}''::jsonb', t);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='created_at') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()', t);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='updated_at') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', t);
            END IF;
        END IF;
    END LOOP;
END $$;

CREATE OR REPLACE VIEW public.vw_os_young_person_profile AS
SELECT
    yp.id,
    yp.id AS young_person_id,
    yp.home_id,
    yp.provider_id,
    yp.first_name,
    yp.last_name,
    COALESCE(NULLIF(yp.preferred_name, ''), NULLIF(yp.display_name, ''), yp.first_name) AS preferred_name,
    COALESCE(NULLIF(yp.display_name, ''), trim(concat_ws(' ', yp.first_name, yp.last_name)), 'Young person ' || yp.id::text) AS display_name,
    yp.date_of_birth,
    COALESCE(yp.age, CASE WHEN yp.date_of_birth IS NOT NULL THEN date_part('year', age(yp.date_of_birth))::int ELSE NULL END) AS age,
    yp.gender,
    yp.admission_date,
    COALESCE(yp.placement_status, yp.status, 'active') AS placement_status,
    COALESCE(yp.summary_risk_level, 'medium') AS summary_risk_level,
    yp.legal_status,
    COALESCE(yp.legal_status_summary, yp.legal_status) AS legal_status_summary,
    yp.care_planning,
    COALESCE(yp.current_placement_plan_status, yp.care_planning) AS current_placement_plan_status,
    yp.photo_url,
    yp.profile_photo_path,
    yp.placing_authority,
    yp.social_worker_name,
    yp.social_worker_email,
    yp.social_worker_phone,
    yp.primary_keyworker_id,
    yp.key_worker_id,
    yp.status,
    yp.archived,
    yp.created_at,
    yp.updated_at
FROM public.young_people yp
WHERE COALESCE(yp.archived, FALSE) = FALSE;

CREATE OR REPLACE VIEW public.vw_os_chronology_pullthrough AS
SELECT
    id,
    source_table,
    source_id,
    source_type,
    record_type,
    young_person_id,
    staff_id,
    home_id,
    provider_id,
    title,
    summary,
    body,
    event_at,
    lifecycle_state,
    emotional_theme,
    child_voice_present,
    safeguarding_marker,
    evidence_ids,
    metadata,
    created_by,
    created_at,
    updated_at
FROM public.os_chronology_events;

-- Pull existing records into the canonical chronology where those tables exist.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_notes') THEN
        INSERT INTO public.os_chronology_events (
            source_table, source_id, source_type, record_type, young_person_id, staff_id, home_id, provider_id,
            title, summary, body, event_at, lifecycle_state, child_voice_present, safeguarding_marker, metadata, created_by
        )
        SELECT
            'daily_notes', id::text, 'daily_note', 'daily_note', young_person_id, staff_id, home_id, provider_id,
            COALESCE(NULLIF(title, ''), 'Daily note'),
            COALESCE(NULLIF(summary, ''), left(COALESCE(note, body, content, ''), 500)),
            COALESCE(note, body, content, summary, ''),
            COALESCE(date_time, occurred_at, created_at, NOW()),
            COALESCE(status, workflow_status, 'recorded'),
            (COALESCE(child_voice, '') <> '' OR COALESCE(wishes_feelings, '') <> ''),
            FALSE,
            jsonb_build_object('pulled_through_from', 'daily_notes'),
            COALESCE(created_by, staff_id)
        FROM public.daily_notes
        ON CONFLICT (source_table, source_id, source_type) DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            body = EXCLUDED.body,
            updated_at = NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='incidents') THEN
        INSERT INTO public.os_chronology_events (
            source_table, source_id, source_type, record_type, young_person_id, staff_id, home_id, provider_id,
            title, summary, body, event_at, lifecycle_state, child_voice_present, safeguarding_marker, metadata, created_by
        )
        SELECT
            'incidents', id::text, 'incident', 'incident', young_person_id, staff_id, home_id, provider_id,
            COALESCE(NULLIF(title, ''), 'Incident'),
            COALESCE(NULLIF(summary, ''), left(COALESCE(description, body, content, ''), 500)),
            COALESCE(description, body, content, summary, ''),
            COALESCE(incident_at, date_time, occurred_at, created_at, NOW()),
            COALESCE(status, workflow_status, 'recorded'),
            (COALESCE(child_voice, '') <> '' OR COALESCE(wishes_feelings, '') <> ''),
            TRUE,
            jsonb_build_object('pulled_through_from', 'incidents'),
            COALESCE(created_by, staff_id)
        FROM public.incidents
        ON CONFLICT (source_table, source_id, source_type) DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            body = EXCLUDED.body,
            updated_at = NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='missing_episodes') THEN
        INSERT INTO public.os_chronology_events (
            source_table, source_id, source_type, record_type, young_person_id, staff_id, home_id, provider_id,
            title, summary, body, event_at, lifecycle_state, child_voice_present, safeguarding_marker, metadata, created_by
        )
        SELECT
            'missing_episodes', id::text, 'missing_episode', 'missing_episode', young_person_id, staff_id, home_id, provider_id,
            COALESCE(NULLIF(title, ''), 'Missing episode'),
            COALESCE(NULLIF(summary, ''), left(COALESCE(description, body, content, ''), 500)),
            COALESCE(description, body, content, summary, ''),
            COALESCE(started_at, missing_from, date_time, created_at, NOW()),
            COALESCE(status, workflow_status, 'recorded'),
            (COALESCE(child_voice, '') <> '' OR COALESCE(return_interview_summary, '') <> ''),
            TRUE,
            jsonb_build_object('pulled_through_from', 'missing_episodes'),
            COALESCE(created_by, staff_id)
        FROM public.missing_episodes
        ON CONFLICT (source_table, source_id, source_type) DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            body = EXCLUDED.body,
            updated_at = NOW();
    END IF;
END $$;

-- Link chronology entries into evidence graph so Care Hub, ORB, reports and
-- governance can pull the same records through one evidence surface.
INSERT INTO public.evidence_links (
    source_table, source_id, source_type, evidence_type, title, summary,
    young_person_id, staff_id, home_id, provider_id, chronology_event_id,
    lifecycle_state, metadata, created_by
)
SELECT
    source_table,
    source_id,
    source_type,
    'chronology_record',
    title,
    summary,
    young_person_id,
    staff_id,
    home_id,
    provider_id,
    id,
    lifecycle_state,
    jsonb_build_object('auto_linked_from', 'os_chronology_events'),
    created_by
FROM public.os_chronology_events
ON CONFLICT (source_table, source_id, evidence_type) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    chronology_event_id = EXCLUDED.chronology_event_id,
    updated_at = NOW();

INSERT INTO public.os_evidence_links (
    source_table, source_id, source_type, evidence_type, title, summary,
    young_person_id, staff_id, home_id, provider_id, chronology_event_id,
    lifecycle_state, metadata, created_by
)
SELECT
    source_table,
    source_id,
    source_type,
    'chronology_record',
    title,
    summary,
    young_person_id,
    staff_id,
    home_id,
    provider_id,
    id,
    lifecycle_state,
    jsonb_build_object('auto_linked_from', 'os_chronology_events'),
    created_by
FROM public.os_chronology_events
ON CONFLICT (source_table, source_id, evidence_type) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    chronology_event_id = EXCLUDED.chronology_event_id,
    updated_at = NOW();

-- Projection snapshots used by ORB/Care Hub under load. One per child with
-- recent chronology and evidence counts.
INSERT INTO public.operational_projection_snapshots (
    projection_key, projection_type, domain, young_person_id, home_id, provider_id, payload, metadata, stale, generated_at, updated_at
)
SELECT
    'child:' || young_person_id::text || ':operational-summary',
    'operational_summary',
    'child',
    young_person_id,
    max(home_id),
    max(provider_id),
    jsonb_build_object(
        'recent_events', count(*),
        'latest_event_at', max(event_at),
        'safeguarding_events', count(*) FILTER (WHERE safeguarding_marker),
        'child_voice_events', count(*) FILTER (WHERE child_voice_present)
    ),
    jsonb_build_object('source', 'os_chronology_events'),
    FALSE,
    NOW(),
    NOW()
FROM public.os_chronology_events
WHERE young_person_id IS NOT NULL
GROUP BY young_person_id
ON CONFLICT (projection_key) DO UPDATE SET
    payload = EXCLUDED.payload,
    metadata = EXCLUDED.metadata,
    stale = FALSE,
    generated_at = NOW(),
    updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_young_people_scope ON public.young_people(home_id, provider_id, archived);
CREATE INDEX IF NOT EXISTS idx_os_chronology_child_event ON public.os_chronology_events(young_person_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_chronology_home_event ON public.os_chronology_events(home_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_links_child ON public.evidence_links(young_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_evidence_links_child ON public.os_evidence_links(young_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_workflow_events_child ON public.record_workflow_events(young_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_projection_snapshots_scope ON public.operational_projection_snapshots(domain, home_id, provider_id, stale);
