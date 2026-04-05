from __future__ import annotations

from services.child_record_builders import (
    build_daily_note_chronology,
    build_daily_note_links,
    build_incident_chronology,
    build_incident_links,
    build_risk_assessment_chronology,
    build_risk_assessment_links,
    build_support_plan_chronology,
    build_support_plan_links,
    build_young_person_appointment_chronology,
    build_young_person_appointment_links,
)
from services.child_record_sync_service import ChildRecordSyncPayload, ChildRecordSyncService
from services.compliance_engine import ComplianceEngine
from services.standards_mapper import StandardsMapper


class YoungPersonOSSync:
    def __init__(self) -> None:
        self.sync_service = ChildRecordSyncService()
        self.standards_mapper = StandardsMapper()
        self.compliance_engine = ComplianceEngine()

    def sync_daily_note(self, note_row: dict, recorded_by_name: str | None = None) -> dict:
        chronology = build_daily_note_chronology(note_row, recorded_by_name=recorded_by_name)
        links = build_daily_note_links(note_row)
        standard_links = self.standards_mapper.map_record(
            young_person_id=note_row["young_person_id"],
            source_table="daily_notes",
            source_id=note_row["id"],
            record=note_row,
            linked_by=note_row.get("author_id"),
        )

        return self.sync_service.sync(
            ChildRecordSyncPayload(
                young_person_id=note_row["young_person_id"],
                source_table="daily_notes",
                source_id=note_row["id"],
                record=note_row,
                recorded_by_name=recorded_by_name,
                chronology=chronology,
                record_links=links,
                standard_links=standard_links,
            )
        )

    def sync_incident(self, incident_row: dict, recorded_by_name: str | None = None) -> dict:
        chronology = build_incident_chronology(incident_row, recorded_by_name=recorded_by_name)
        links = build_incident_links(incident_row)
        standard_links = self.standards_mapper.map_record(
            young_person_id=incident_row["young_person_id"],
            source_table="incidents",
            source_id=incident_row["id"],
            record=incident_row,
            linked_by=incident_row.get("staff_id") or incident_row.get("created_by"),
        )

        result = self.sync_service.sync(
            ChildRecordSyncPayload(
                young_person_id=incident_row["young_person_id"],
                source_table="incidents",
                source_id=incident_row["id"],
                record=incident_row,
                recorded_by_name=recorded_by_name,
                chronology=chronology,
                record_links=links,
                standard_links=standard_links,
            )
        )

        self.compliance_engine.create_incident_follow_up_if_needed(incident_row)
        return result

    def sync_risk_assessment(self, risk_row: dict, recorded_by_name: str | None = None) -> dict:
        chronology = build_risk_assessment_chronology(risk_row, recorded_by_name=recorded_by_name)
        links = build_risk_assessment_links(risk_row)
        standard_links = self.standards_mapper.map_record(
            young_person_id=risk_row["young_person_id"],
            source_table="risk_assessments",
            source_id=risk_row["id"],
            record=risk_row,
            linked_by=risk_row.get("created_by"),
        )

        result = self.sync_service.sync(
            ChildRecordSyncPayload(
                young_person_id=risk_row["young_person_id"],
                source_table="risk_assessments",
                source_id=risk_row["id"],
                record=risk_row,
                recorded_by_name=recorded_by_name,
                chronology=chronology,
                record_links=links,
                standard_links=standard_links,
            )
        )

        self.compliance_engine.create_risk_review_due_item(risk_row)
        return result

    def sync_support_plan(self, plan_row: dict, recorded_by_name: str | None = None) -> dict:
        chronology = build_support_plan_chronology(plan_row, recorded_by_name=recorded_by_name)
        links = build_support_plan_links(plan_row)
        standard_links = self.standards_mapper.map_record(
            young_person_id=plan_row["young_person_id"],
            source_table="support_plans",
            source_id=plan_row["id"],
            record=plan_row,
            linked_by=plan_row.get("created_by"),
        )

        return self.sync_service.sync(
            ChildRecordSyncPayload(
                young_person_id=plan_row["young_person_id"],
                source_table="support_plans",
                source_id=plan_row["id"],
                record=plan_row,
                recorded_by_name=recorded_by_name,
                chronology=chronology,
                record_links=links,
                standard_links=standard_links,
            )
        )

    def sync_young_person_appointment(self, appointment_row: dict, recorded_by_name: str | None = None) -> dict:
        chronology = build_young_person_appointment_chronology(
            appointment_row,
            recorded_by_name=recorded_by_name,
        )
        links = build_young_person_appointment_links(appointment_row)
        standard_links = self.standards_mapper.map_record(
            young_person_id=appointment_row["young_person_id"],
            source_table="young_person_appointments",
            source_id=appointment_row["id"],
            record=appointment_row,
            linked_by=appointment_row.get("created_by"),
        )

        result = self.sync_service.sync(
            ChildRecordSyncPayload(
                young_person_id=appointment_row["young_person_id"],
                source_table="young_person_appointments",
                source_id=appointment_row["id"],
                record=appointment_row,
                recorded_by_name=recorded_by_name,
                chronology=chronology,
                record_links=links,
                standard_links=standard_links,
            )
        )

        self.compliance_engine.create_yp_appointment_follow_up_if_needed(appointment_row)
        return result

    def archive_record(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
    ) -> None:
        self.sync_service.archive(
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
        )
