from __future__ import annotations

from typing import Any

from services.young_person_os_sync import YoungPersonOSSync


class OSSyncDispatcher:
    """
    Routes saved domain records into the shared young person OS sync layer.

    This is intentionally tolerant:
    - unsupported source tables are ignored
    - missing/invalid records are ignored
    - the caller should not fail just because OS sync has no handler yet
    """

    def __init__(self) -> None:
        self.os_sync = YoungPersonOSSync()

    def sync(self, *, source_table: str, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        if not source_table or not isinstance(record, dict) or not record:
            return False

        table = str(source_table).strip().lower()

        if table == "daily_notes":
            self.os_sync.sync_daily_note(record, recorded_by_name=recorded_by_name)
            return True

        if table == "incidents":
            self.os_sync.sync_incident(record, recorded_by_name=recorded_by_name)
            return True

        if table == "risk_assessments":
            self.os_sync.sync_risk_assessment(record, recorded_by_name=recorded_by_name)
            return True

        if table == "support_plans":
            self.os_sync.sync_support_plan(record, recorded_by_name=recorded_by_name)
            return True

        if table == "young_person_appointments":
            self.os_sync.sync_young_person_appointment(record, recorded_by_name=recorded_by_name)
            return True

        if table == "keywork_sessions":
            self.os_sync.sync_keywork_session(record, recorded_by_name=recorded_by_name)
            return True

        if table == "health_records":
            self.os_sync.sync_health_record(record, recorded_by_name=recorded_by_name)
            return True

        if table == "education_records":
            self.os_sync.sync_education_record(record, recorded_by_name=recorded_by_name)
            return True

        if table == "family_contact_records":
            self.os_sync.sync_family_contact_record(record, recorded_by_name=recorded_by_name)
            return True

        # Keep operational appointments separate unless you later choose to map them.
        if table == "appointments":
            return False

        return False


os_sync_dispatcher = OSSyncDispatcher()
