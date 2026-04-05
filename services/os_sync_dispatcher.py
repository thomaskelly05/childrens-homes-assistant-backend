from __future__ import annotations

from typing import Any

from services.young_person_os_sync import YoungPersonOSSync


class OSSyncDispatcher:
    def __init__(self) -> None:
        self.os_sync = YoungPersonOSSync()

        self._sync_map = {
            "daily_notes": self.os_sync.sync_daily_note,
            "incidents": self.os_sync.sync_incident,
            "risk_assessments": self.os_sync.sync_risk_assessment,
            "support_plans": self.os_sync.sync_support_plan,
            "young_person_appointments": self.os_sync.sync_young_person_appointment,
        }

    def sync_record(
        self,
        *,
        source_table: str,
        record: dict[str, Any],
        recorded_by_name: str | None = None,
    ) -> dict[str, Any] | None:
        sync_fn = self._sync_map.get(source_table)
        if sync_fn is None:
            return None
        return sync_fn(record, recorded_by_name=recorded_by_name)

    def archive_record(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
    ) -> None:
        self.os_sync.archive_record(
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
        )
