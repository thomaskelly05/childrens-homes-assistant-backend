from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("indicare.db.schema_doctor")

SUPERSEDED_MIGRATIONS = {
    "999": "superseded_operational_postgres_convergence",
}

TABLE_FIELDS: dict[str, list[tuple[str, str]]] = {
    "young_people": [
        ("display_name", "TEXT"), ("preferred_name", "TEXT"), ("first_name", "TEXT"), ("last_name", "TEXT"),
        ("date_of_birth", "DATE"), ("age", "INTEGER"), ("gender", "TEXT"), ("ethnicity", "TEXT"),
        ("nhs_number", "TEXT"), ("local_id_number", "TEXT"), ("admission_date", "DATE"), ("discharge_date", "DATE"),
        ("placement_status", "TEXT"), ("status", "TEXT DEFAULT 'active'"), ("summary_risk_level", "TEXT"),
        ("risk_level", "TEXT"), ("os_state", "TEXT"), ("legal_status", "TEXT"), ("legal_status_summary", "TEXT"),
        ("care_planning", "TEXT"), ("current_placement_plan_status", "TEXT"), ("placement_plan_summary", "TEXT"),
        ("photo_url", "TEXT"), ("profile_photo_path", "TEXT"), ("placing_authority", "TEXT"),
        ("social_worker_name", "TEXT"), ("social_worker_email", "TEXT"), ("social_worker_phone", "TEXT"),
        ("primary_keyworker_id", "INTEGER"), ("key_worker_id", "INTEGER"), ("home_id", "INTEGER"),
        ("provider_id", "INTEGER"), ("archived", "BOOLEAN DEFAULT FALSE"), ("metadata", "JSONB DEFAULT '{}'::jsonb"),
        ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
    ],
    "daily_notes": [
        ("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("staff_id", "INTEGER"),
        ("note_date", "DATE"), ("shift_type", "TEXT"), ("mood", "TEXT"), ("presentation", "TEXT"),
        ("activities", "TEXT"), ("education_update", "TEXT"), ("health_update", "TEXT"), ("family_update", "TEXT"),
        ("behaviour_update", "TEXT"), ("young_person_voice", "TEXT"), ("positives", "TEXT"),
        ("actions_required", "TEXT"), ("routine_stability", "TEXT"), ("relationships_update", "TEXT"),
        ("emotional_wellbeing", "TEXT"), ("safeguarding_concerns", "TEXT"), ("staff_reflection", "TEXT"),
        ("workflow_status", "TEXT"), ("manager_review_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
    ],
    "incidents": [
        ("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("staff_id", "INTEGER"),
        ("incident_type", "TEXT"), ("description", "TEXT"), ("incident_datetime", "TIMESTAMPTZ"),
        ("location", "TEXT"), ("antecedent", "TEXT"), ("staff_response", "TEXT"), ("child_response", "TEXT"),
        ("outcome", "TEXT"), ("injury_flag", "BOOLEAN DEFAULT FALSE"), ("police_involved", "BOOLEAN DEFAULT FALSE"),
        ("safeguarding_flag", "BOOLEAN DEFAULT FALSE"), ("severity", "TEXT"), ("presentation", "TEXT"),
        ("trauma_informed_formulation", "TEXT"), ("child_voice", "TEXT"), ("restorative_follow_up", "TEXT"),
        ("actions_taken", "TEXT"), ("requires_reg40", "BOOLEAN DEFAULT FALSE"), ("requires_notification", "BOOLEAN DEFAULT FALSE"),
        ("workflow_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
    ],
    "missing_episodes": [
        ("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("staff_id", "INTEGER"),
        ("start_datetime", "TIMESTAMPTZ"), ("reported_datetime", "TIMESTAMPTZ"), ("return_datetime", "TIMESTAMPTZ"),
        ("police_reference", "TEXT"), ("trigger_factors", "TEXT"), ("push_pull_factors", "TEXT"),
        ("actions_taken", "TEXT"), ("outcome", "TEXT"), ("child_voice", "TEXT"), ("contextual_risk_notes", "TEXT"),
        ("workflow_status", "TEXT"), ("manager_review_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
    ],
    "risk_assessments": [("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("category", "TEXT"), ("title", "TEXT"), ("concern_summary", "TEXT"), ("known_triggers", "TEXT"), ("early_warning_signs", "TEXT"), ("contextual_factors", "TEXT"), ("protective_factors", "TEXT"), ("staff_response_plan", "TEXT"), ("child_voice", "TEXT"), ("review_date", "DATE"), ("workflow_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()")],
    "support_plans": [("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("plan_type", "TEXT"), ("title", "TEXT"), ("presenting_need", "TEXT"), ("summary", "TEXT"), ("child_voice", "TEXT"), ("proactive_strategies", "TEXT"), ("co_regulation_strategies", "TEXT"), ("relationships_support", "TEXT"), ("review_date", "DATE"), ("workflow_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()")],
    "health_records": [("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("record_type", "TEXT"), ("event_datetime", "TIMESTAMPTZ"), ("title", "TEXT"), ("summary", "TEXT"), ("professional_name", "TEXT"), ("outcome", "TEXT"), ("child_voice", "TEXT"), ("workflow_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()")],
    "education_records": [("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("record_date", "DATE"), ("attendance_status", "TEXT"), ("provision_name", "TEXT"), ("behaviour_summary", "TEXT"), ("learning_engagement", "TEXT"), ("issue_raised", "TEXT"), ("support_action", "TEXT"), ("child_voice", "TEXT"), ("workflow_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()")],
    "family_contact_records": [("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("contact_datetime", "TIMESTAMPTZ"), ("contact_type", "TEXT"), ("contact_person", "TEXT"), ("supervision_level", "TEXT"), ("location", "TEXT"), ("pre_contact_presentation", "TEXT"), ("post_contact_presentation", "TEXT"), ("child_voice", "TEXT"), ("workflow_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()")],
    "keywork_sessions": [("young_person_id", "INTEGER"), ("home_id", "INTEGER"), ("provider_id", "INTEGER"), ("session_date", "DATE"), ("worker_id", "INTEGER"), ("topic", "TEXT"), ("purpose", "TEXT"), ("summary", "TEXT"), ("child_voice", "TEXT"), ("reflective_analysis", "TEXT"), ("workflow_status", "TEXT"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()")],
    "os_chronology_events": [
        ("provider_id", "INTEGER"), ("home_id", "INTEGER"), ("young_person_id", "INTEGER"), ("staff_id", "INTEGER"),
        ("event_type", "TEXT"), ("event_title", "TEXT"), ("event_summary", "TEXT"), ("event_at", "TIMESTAMPTZ DEFAULT NOW()"),
        ("source_table", "TEXT"), ("source_id", "TEXT"), ("source_type", "TEXT"), ("record_type", "TEXT"),
        ("title", "TEXT"), ("summary", "TEXT"), ("body", "TEXT"), ("lifecycle_state", "TEXT DEFAULT 'recorded'"),
        ("emotional_theme", "TEXT"), ("child_voice_present", "BOOLEAN DEFAULT FALSE"), ("safeguarding_marker", "BOOLEAN DEFAULT FALSE"),
        ("evidence_ids", "JSONB DEFAULT '[]'::jsonb"), ("metadata", "JSONB DEFAULT '{}'::jsonb"),
        ("created_by", "INTEGER"), ("created_at", "TIMESTAMPTZ DEFAULT NOW()"), ("updated_at", "TIMESTAMPTZ DEFAULT NOW()"),
    ],
}


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _ensure_migration_tracking(cur: Any) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    for version, name in SUPERSEDED_MIGRATIONS.items():
        cur.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (%s, %s) ON CONFLICT (version) DO NOTHING",
            (version, name),
        )


def run_schema_doctor(conn: Any) -> dict[str, Any]:
    added: list[str] = []
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
        _ensure_migration_tracking(cur)
        for table, fields in TABLE_FIELDS.items():
            cur.execute(f"CREATE TABLE IF NOT EXISTS public.{_q(table)} (id BIGSERIAL PRIMARY KEY)")
            for column, definition in fields:
                cur.execute(f"ALTER TABLE public.{_q(table)} ADD COLUMN IF NOT EXISTS {_q(column)} {definition}")
                added.append(f"{table}.{column}")

        cur.execute(
            """
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
                workflow_event_id BIGINT,
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
            )
            """
        )
        cur.execute("CREATE TABLE IF NOT EXISTS public.os_evidence_links (LIKE public.evidence_links INCLUDING DEFAULTS INCLUDING CONSTRAINTS)")
        cur.execute(
            """
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
            )
            """
        )

        cur.execute("DROP VIEW IF EXISTS public.vw_os_chronology_pullthrough CASCADE")
        cur.execute("DROP VIEW IF EXISTS public.vw_os_young_person_profile CASCADE")
        cur.execute(
            """
            CREATE VIEW public.vw_os_young_person_profile AS
            SELECT yp.*,
                   yp.id AS young_person_id,
                   COALESCE(NULLIF(yp.preferred_name, ''), NULLIF(yp.display_name, ''), yp.first_name) AS os_preferred_name,
                   COALESCE(NULLIF(yp.display_name, ''), NULLIF(trim(concat_ws(' ', yp.first_name, yp.last_name)), ''), 'Young person ' || yp.id::text) AS os_display_name
            FROM public.young_people yp
            """
        )
        cur.execute(
            """
            CREATE VIEW public.vw_os_chronology_pullthrough AS
            SELECT id,
                   source_table,
                   source_id::text AS source_id,
                   COALESCE(source_type, event_type, record_type, 'record') AS source_type,
                   COALESCE(record_type, source_type, event_type, 'record') AS record_type,
                   young_person_id,
                   staff_id,
                   home_id,
                   provider_id,
                   COALESCE(title, event_title, 'Record') AS title,
                   COALESCE(summary, event_summary, body, '') AS summary,
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
            FROM public.os_chronology_events
            """
        )
    logger.info("Schema doctor completed field drift repair for %s tables", len(TABLE_FIELDS))
    return {"tables_checked": len(TABLE_FIELDS), "columns_ensured": len(added), "superseded_migrations": sorted(SUPERSEDED_MIGRATIONS)}
