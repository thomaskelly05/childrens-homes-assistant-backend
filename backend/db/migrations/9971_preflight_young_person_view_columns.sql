-- Preflight columns required by any deployed vw_os_young_person_profile definition.
-- This protects startup where migration 1000 references richer young_people fields.
CREATE TABLE IF NOT EXISTS public.young_people (id BIGSERIAL PRIMARY KEY);

ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS placement_status TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS summary_risk_level TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS os_state TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS legal_status TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS legal_status_summary TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS care_planning TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS current_placement_plan_status TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS placement_plan_summary TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS profile_photo_path TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS placing_authority TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS social_worker_name TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS social_worker_email TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS social_worker_phone TEXT;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS primary_keyworker_id INTEGER;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS key_worker_id INTEGER;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS home_id INTEGER;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS provider_id INTEGER;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.young_people ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP VIEW IF EXISTS public.vw_os_young_person_profile CASCADE;
