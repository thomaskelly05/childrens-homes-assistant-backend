from __future__ import annotations

from services.chronology_writer import ChronologyEventInput
from services.record_link_service import RecordLinkInput


def build_incident_chronology(record: dict, recorded_by_name: str | None = None) -> ChronologyEventInput:
    return ChronologyEventInput(
        young_person_id=record["young_person_id"],
        home_id=record.get("home_id"),
        source_table="incidents",
        source_id=record["id"],
        event_datetime=record.get("incident_datetime"),
        category="incident",
        subcategory=record.get("incident_type"),
        title=record.get("incident_type") or "Incident recorded",
        summary=record.get("description") or "",
        significance="high" if record.get("safeguarding_flag") else "medium",
        created_by=record.get("staff_id") or record.get("created_by"),
        auto_generated=True,
        is_visible=not bool(record.get("archived")),
        metadata_json={
            "location": record.get("location"),
            "injury_flag": record.get("injury_flag"),
            "police_involved": record.get("police_involved"),
            "manager_review_required": record.get("manager_review_required"),
            "follow_up_required": record.get("follow_up_required"),
        },
        event_status=record.get("manager_review_status"),
        tags_json=[
            tag for tag in [
                record.get("incident_type"),
                "safeguarding" if record.get("safeguarding_flag") else None,
                "police" if record.get("police_involved") else None,
            ] if tag
        ],
        recorded_by_name=recorded_by_name,
        workflow_status=record.get("workflow_status"),
        safeguarding_flag=bool(record.get("safeguarding_flag")),
        child_voice_present=bool(record.get("child_voice")),
        severity=record.get("severity"),
        primary_record_type="incident",
    )


def build_incident_links(record: dict) -> list[RecordLinkInput]:
    links: list[RecordLinkInput] = []

    young_person_id = record["young_person_id"]
    created_by = record.get("staff_id") or record.get("created_by")
    incident_id = record["id"]

    linked_risk_id = record.get("linked_risk_assessment_id")
    if linked_risk_id:
        links.append(
            RecordLinkInput(
                young_person_id=young_person_id,
                from_table="incidents",
                from_id=incident_id,
                to_table="risk_assessments",
                to_id=int(linked_risk_id),
                relationship_type="informs",
                created_by=created_by,
            )
        )

    linked_plan_id = record.get("linked_support_plan_id")
    if linked_plan_id:
        links.append(
            RecordLinkInput(
                young_person_id=young_person_id,
                from_table="incidents",
                from_id=incident_id,
                to_table="support_plans",
                to_id=int(linked_plan_id),
                relationship_type="updates",
                created_by=created_by,
            )
        )

    return links


def build_daily_note_chronology(record: dict, recorded_by_name: str | None = None) -> ChronologyEventInput:
    summary_parts = [
        record.get("presentation"),
        record.get("activities"),
        record.get("behaviour_update"),
        record.get("actions_required"),
    ]
    summary = " ".join(part.strip() for part in summary_parts if part)

    return ChronologyEventInput(
        young_person_id=record["young_person_id"],
        home_id=record.get("home_id"),
        source_table="daily_notes",
        source_id=record["id"],
        event_datetime=record.get("note_date"),
        category="daily_note",
        subcategory=record.get("shift_type"),
        title=f"{(record.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note",
        summary=summary[:1200],
        significance=record.get("significance") or "medium",
        created_by=record.get("author_id"),
        auto_generated=True,
        is_visible=True,
        metadata_json={
            "mood": record.get("mood"),
            "health_update": record.get("health_update"),
            "education_update": record.get("education_update"),
            "family_update": record.get("family_update"),
        },
        tags_json=list(record.get("quality_standards_tags") or []),
        recorded_by_name=recorded_by_name,
        workflow_status=record.get("workflow_status"),
        safeguarding_flag=False,
        child_voice_present=bool(record.get("young_person_voice")),
        severity=None,
        primary_record_type="daily_note",
    )


def build_young_person_appointment_chronology(record: dict, recorded_by_name: str | None = None) -> ChronologyEventInput:
    return ChronologyEventInput(
        young_person_id=record["young_person_id"],
        home_id=None,
        source_table="young_person_appointments",
        source_id=record["id"],
        event_datetime=record.get("appointment_date"),
        category="appointment",
        subcategory=record.get("appointment_type"),
        title=record.get("title") or "Appointment",
        summary=record.get("summary") or record.get("purpose") or "",
        significance="medium",
        created_by=record.get("created_by"),
        auto_generated=True,
        is_visible=True,
        metadata_json={
            "location": record.get("location"),
            "professional_name": record.get("professional_name"),
            "professional_role": record.get("professional_role"),
            "status": record.get("status"),
        },
        tags_json=[
            tag for tag in [
                record.get("appointment_type"),
                record.get("status"),
            ] if tag
        ],
        recorded_by_name=recorded_by_name,
        workflow_status="approved",
        safeguarding_flag=False,
        child_voice_present=bool(record.get("child_voice")),
        severity=None,
        primary_record_type="young_person_appointment",
    )


def build_young_person_appointment_links(record: dict) -> list[RecordLinkInput]:
    links: list[RecordLinkInput] = []

    if record.get("linked_plan_id"):
        links.append(
            RecordLinkInput(
                young_person_id=record["young_person_id"],
                from_table="young_person_appointments",
                from_id=record["id"],
                to_table="support_plans",
                to_id=int(record["linked_plan_id"]),
                relationship_type="supports",
                created_by=record.get("created_by"),
            )
        )

    return links
