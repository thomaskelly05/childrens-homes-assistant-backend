from __future__ import annotations

from typing import Any

from services.staff_linking_service import STAFF_TABLES, staff_linking_service
from services.young_person_os_sync import YoungPersonOSSync


TABLE_ALIASES = {
    "young_person_health_profile": "health_records",
    "medication_profiles": "health_records",
    "medication_records": "health_records",
    "young_person_education_profile": "education_records",
    "young_person_contacts": "family_contact_records",
    "placement_plans": "support_plans",
    "care_plans": "support_plans",
    "documents": "support_plans",
    "child_documents": "support_plans",
    "uploaded_documents": "support_plans",
    "generated_documents": "support_plans",
    "inspection_evidence_facts": "support_plans",
    "statutory_documents": "support_plans",
    "handover_records": "support_plans",
    "safeguarding_records": "incidents",
    "missing_episodes": "incidents",
}


class OSSyncDispatcher:
    """
    Routes saved domain records into the OS sync layer.

    Staff/workforce records now use StaffLinkingService so they remain workforce
    evidence. Child-linked compatibility tables still route through the closest
    existing child-record sync pathway.
    """

    def __init__(self) -> None:
        self.os_sync = YoungPersonOSSync()

    def sync(self, *, source_table: str, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        if not source_table or not isinstance(record, dict) or not record:
            return False

        original_table = str(source_table).strip().lower()
        if original_table in STAFF_TABLES:
            return staff_linking_service.sync_staff_record(
                NoneSafeConnection.from_record(record),
                source_table=original_table,
                record=record,
                recorded_by_name=recorded_by_name,
            )

        table = TABLE_ALIASES.get(original_table, original_table)
        payload = dict(record)
        payload.setdefault("original_source_table", original_table)
        payload.setdefault("source_table", original_table)
        if original_table != table:
            payload.setdefault("primary_record_type", original_table.rstrip("s"))
            payload.setdefault("record_type", original_table.rstrip("s"))
            payload.setdefault("event_type", original_table.rstrip("s"))
            payload.setdefault("standards_rationale", f"Auto-linked from {original_table} through OS sync alias")

        if table == "daily_notes":
            self.os_sync.sync_daily_note(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "incidents":
            self.os_sync.sync_incident(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "risk_assessments":
            self.os_sync.sync_risk_assessment(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "support_plans":
            self.os_sync.sync_support_plan(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "young_person_appointments":
            self.os_sync.sync_young_person_appointment(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "keywork_sessions":
            self.os_sync.sync_keywork_session(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "health_records":
            self.os_sync.sync_health_record(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "education_records":
            self.os_sync.sync_education_record(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "family_contact_records":
            self.os_sync.sync_family_contact_record(payload, recorded_by_name=recorded_by_name)
            return True
        if table == "appointments":
            return False
        return False


class NoneSafeConnection:
    """Placeholder shim to fetch a DB connection lazily for staff sync."""

    @staticmethod
    def from_record(_record: dict[str, Any]):
        from db.connection import get_db_connection, release_db_connection

        class _ConnectionProxy:
            def __init__(self) -> None:
                self._conn = get_db_connection()

            def __getattr__(self, item):
                return getattr(self._conn, item)

            def commit(self):
                try:
                    return self._conn.commit()
                finally:
                    release_db_connection(self._conn)

            def rollback(self):
                return self._conn.rollback()

        return _ConnectionProxy()


os_sync_dispatcher = OSSyncDispatcher()
