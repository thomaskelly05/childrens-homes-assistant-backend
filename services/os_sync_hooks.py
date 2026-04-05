from __future__ import annotations

from typing import Any

from services.os_sync_dispatcher import OSSyncDispatcher


_dispatcher = OSSyncDispatcher()


def sync_after_save(
    *,
    source_table: str,
    record: dict[str, Any],
    recorded_by_name: str | None = None,
) -> dict[str, Any] | None:
    return _dispatcher.sync_record(
        source_table=source_table,
        record=record,
        recorded_by_name=recorded_by_name,
    )


def archive_after_status_change(
    *,
    young_person_id: int,
    source_table: str,
    source_id: int,
) -> None:
    _dispatcher.archive_record(
        young_person_id=young_person_id,
        source_table=source_table,
        source_id=source_id,
    )
