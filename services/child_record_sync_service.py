from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from services.chronology_writer import ChronologyEventInput, ChronologyWriter
from services.record_link_service import RecordLinkInput, RecordLinkService
from services.standards_link_service import StandardLinkInput, StandardsLinkService


@dataclass(slots=True)
class ChildRecordSyncPayload:
    young_person_id: int
    source_table: str
    source_id: int
    record: dict[str, Any]
    recorded_by_name: str | None = None
    chronology: ChronologyEventInput | None = None
    record_links: list[RecordLinkInput] = field(default_factory=list)
    standard_links: list[StandardLinkInput] = field(default_factory=list)


class ChildRecordSyncService:
    def __init__(self) -> None:
        self.chronology_writer = ChronologyWriter()
        self.record_link_service = RecordLinkService()
        self.standards_link_service = StandardsLinkService()

    def sync(self, payload: ChildRecordSyncPayload) -> dict[str, Any]:
        chronology_event_id = None

        if payload.chronology is not None:
            chronology_event_id = self.chronology_writer.upsert_event(payload.chronology)

        if payload.record_links:
            self._replace_record_links(
                young_person_id=payload.young_person_id,
                source_table=payload.source_table,
                source_id=payload.source_id,
                links=payload.record_links,
            )

        if payload.standard_links:
            self.standards_link_service.replace_links_for_record(
                young_person_id=payload.young_person_id,
                source_table=payload.source_table,
                source_id=payload.source_id,
                links=payload.standard_links,
            )

        return {
            "ok": True,
            "chronology_event_id": chronology_event_id,
            "linked_records_count": len(payload.record_links),
            "linked_standards_count": len(payload.standard_links),
        }

    def archive(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
    ) -> None:
        self.chronology_writer.archive_event(
            source_table=source_table,
            source_id=source_id,
            young_person_id=young_person_id,
        )

    def delete(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
    ) -> None:
        self.chronology_writer.delete_event(
            source_table=source_table,
            source_id=source_id,
            young_person_id=young_person_id,
        )

    def _replace_record_links(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        links: list[RecordLinkInput],
    ) -> None:
        grouped: dict[str, list[tuple[str, int]]] = {}
        created_by = None

        for link in links:
            grouped.setdefault(link.relationship_type, []).append((link.to_table, link.to_id))
            if created_by is None:
                created_by = link.created_by

        for relationship_type, targets in grouped.items():
            self.record_link_service.replace_links_for_source(
                young_person_id=young_person_id,
                from_table=source_table,
                from_id=source_id,
                relationship_type=relationship_type,
                targets=targets,
                created_by=created_by,
            )
