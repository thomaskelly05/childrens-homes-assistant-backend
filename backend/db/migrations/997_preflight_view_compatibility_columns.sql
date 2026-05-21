-- Preflight compatibility for older field-preservation view definitions.
-- Runs before 998/1000 so startup-safe views can reference these columns.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.young_people (id BIGSERIAL PRIMARY KEY);
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS home_id INTEGER;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS provider_id INTEGER;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.os_chronology_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS source_table TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS record_type TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS event_title TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS event_summary TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS event_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS lifecycle_state TEXT DEFAULT 'recorded';
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS emotional_theme TEXT;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS child_voice_present BOOLEAN DEFAULT FALSE;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS safeguarding_marker BOOLEAN DEFAULT FALSE;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS evidence_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS young_person_id INTEGER;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS staff_id INTEGER;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS home_id INTEGER;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS provider_id INTEGER;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.os_chronology_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP VIEW IF EXISTS public.vw_os_chronology_pullthrough CASCADE;
DROP VIEW IF EXISTS public.vw_os_young_person_profile CASCADE;
