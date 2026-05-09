-- Universal record editing/version history layer

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.universal_record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.universal_records(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  change_type text NOT NULL DEFAULT 'edit',
  title text NULL,
  summary text NULL,
  narrative text NULL,
  child_voice text NULL,
  staff_reflection text NULL,
  staff_analysis text NULL,
  therapeutic_analysis text NULL,
  status text NULL,
  review_state text NULL,
  changed_by int4 NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_reason text NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT universal_record_versions_unique UNIQUE (record_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_universal_record_versions_record
  ON public.universal_record_versions(record_id);

CREATE INDEX IF NOT EXISTS idx_universal_record_versions_changed_at
  ON public.universal_record_versions(changed_at DESC);

CREATE OR REPLACE VIEW public.vw_universal_record_latest_versions AS
SELECT DISTINCT ON (record_id)
  *
FROM public.universal_record_versions
ORDER BY record_id, version_number DESC;
