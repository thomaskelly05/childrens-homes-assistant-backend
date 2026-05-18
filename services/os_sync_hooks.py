from __future__ import annotations

from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.os_sync_dispatcher import os_sync_dispatcher


SUPPORTED_SYNC_TABLES = {
    "daily_notes",
    "incidents",
    "risk_assessments",
    "support_plans",
    "placement_plans",
    "care_plans",
    "young_person_appointments",
    "keywork_sessions",
    "health_records",
    "young_person_health_profile",
    "medication_profiles",
    "medication_records",
    "education_records",
    "young_person_education_profile",
    "family_contact_records",
    "young_person_contacts",
    "missing_episodes",
    "safeguarding_records",
    "handover_records",
    "documents",
    "statutory_documents",
    "child_documents",
    "uploaded_documents",
    "generated_documents",
    "inspection_evidence_facts",
    "staff_supervisions",
    "workforce_supervision_records",
    "staff_training_matrix",
    "staff_training_records",
    "staff_induction_checklist_items",
    "staff_probation_reviews",
    "staff_profile",
    "workforce_evidence",
    "staff",
}


def sync_after_save(
    source_table: str | None = None,
    record: dict[str, Any] | None = None,
    recorded_by_name: str | None = None,
) -> bool:
    """
    Safe hook for domain services after a record is created/updated/submitted/etc.

    Returns True if a supported record was dispatched.
    Returns False if ignored or if sync failed.

    Accepts both historical calling styles:
    - sync_after_save(source_table="daily_notes", record=row)
    - sync_after_save("daily_notes", row)
    """

    if not source_table or not isinstance(record, dict) or not record:
        return False

    table = str(source_table).strip().lower()
    if table not in SUPPORTED_SYNC_TABLES:
        return False

    try:
        return bool(
            os_sync_dispatcher.sync(
                source_table=table,
                record=record,
                recorded_by_name=recorded_by_name,
            )
        )
    except Exception:
        # Never let OS sync break the source record workflow.
        return False


def archive_after_status_change(
    *,
    young_person_id: int | None,
    source_table: str,
    source_id: int | str | None,
) -> bool:
    """
    Best-effort archive/visibility cleanup for chronology rows linked to a source record.

    This does NOT delete chronology.
    It simply marks matching rows as no longer visible / archived-style status where possible.
    """

    if not young_person_id or not source_table or source_id is None:
        return False

    conn = None
    try:
        conn = get_db_connection()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE chronology_events
                SET
                    is_visible = FALSE,
                    event_status = %s,
                    workflow_status = %s,
                    updated_at = NOW()
                WHERE young_person_id = %s
                  AND source_table = %s
                  AND source_id = %s
                """,
                (
                    "archived",
                    "archived",
                    young_person_id,
                    source_table,
                    source_id,
                ),
            )

        conn.commit()
        return True
    except Exception:
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    finally:
        release_db_connection(conn)
