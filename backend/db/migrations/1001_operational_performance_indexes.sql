-- Operational performance indexes for Care Hub, child workspace, chronology and live feed.
-- Additive only. Uses normal CREATE INDEX IF NOT EXISTS because startup migrations run inside a transaction.

CREATE INDEX IF NOT EXISTS idx_young_people_home_status
    ON public.young_people (home_id, placement_status)
    WHERE archived IS DISTINCT FROM TRUE;

CREATE INDEX IF NOT EXISTS idx_young_people_provider_home
    ON public.young_people (provider_id, home_id)
    WHERE archived IS DISTINCT FROM TRUE;

CREATE INDEX IF NOT EXISTS idx_os_chronology_young_person_event_at
    ON public.os_chronology_events (young_person_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_chronology_home_event_at
    ON public.os_chronology_events (home_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_chronology_source_lookup
    ON public.os_chronology_events (source_table, source_id, source_type);

CREATE INDEX IF NOT EXISTS idx_evidence_links_young_person
    ON public.evidence_links (young_person_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_links_source_lookup
    ON public.evidence_links (source_table, source_id, evidence_type);

CREATE INDEX IF NOT EXISTS idx_os_evidence_links_young_person
    ON public.os_evidence_links (young_person_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_evidence_links_source_lookup
    ON public.os_evidence_links (source_table, source_id, evidence_type);

CREATE INDEX IF NOT EXISTS idx_daily_notes_young_person_recent
    ON public.daily_notes (young_person_id, COALESCE(updated_at, created_at, note_date::timestamp) DESC);

CREATE INDEX IF NOT EXISTS idx_daily_notes_home_recent
    ON public.daily_notes (home_id, COALESCE(updated_at, created_at, note_date::timestamp) DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_young_person_recent
    ON public.incidents (young_person_id, COALESCE(incident_datetime, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_home_recent
    ON public.incidents (home_id, COALESCE(incident_datetime, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_missing_episodes_young_person_recent
    ON public.missing_episodes (young_person_id, COALESCE(start_datetime, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_missing_episodes_home_recent
    ON public.missing_episodes (home_id, COALESCE(start_datetime, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_education_records_young_person_recent
    ON public.education_records (young_person_id, COALESCE(record_date::timestamp, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_health_records_young_person_recent
    ON public.health_records (young_person_id, COALESCE(event_datetime, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_family_contact_records_young_person_recent
    ON public.family_contact_records (young_person_id, COALESCE(contact_datetime, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_keywork_sessions_young_person_recent
    ON public.keywork_sessions (young_person_id, COALESCE(session_date::timestamp, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_operational_projection_subject
    ON public.operational_projection_snapshots (domain, young_person_id, home_id, provider_id, updated_at DESC);
