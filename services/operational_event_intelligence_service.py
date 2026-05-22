from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from services.therapeutic_language_analysis_service import therapeutic_language_analysis_service


@dataclass(frozen=True)
class OperationalEvent:
    event_id: str
    event_type: str
    event_category: str
    young_person_id: int | None
    staff_id: int | None
    home_id: int | None
    provider_id: int | None
    title: str
    summary: str
    therapeutic_summary: str
    event_at: str
    created_at: str
    severity: str
    safeguarding: bool
    requires_review: bool
    inspection_relevant: bool
    orb_visible: bool
    child_voice_present: bool
    restorative_practice_present: bool
    evidence_count: int
    workflow_state: str
    source_table: str
    source_id: str
    projection_tags: list[str]
    risk_tags: list[str]
    emotional_tags: list[str]
    relationship_tags: list[str]

    def model_dump(self) -> dict[str, Any]:
        return self.__dict__


class OperationalEventIntelligenceService:
    def build_event(self, *, source_table: str, record: dict[str, Any]) -> OperationalEvent:
        combined_text = " ".join(
            str(record.get(field) or "")
            for field in [
                "summary",
                "description",
                "note",
                "body",
                "presentation",
                "child_voice",
                "young_person_voice",
                "reflective_analysis",
            ]
        ).strip()

        therapeutic = therapeutic_language_analysis_service.analyse(combined_text)

        safeguarding = any(
            bool(record.get(field))
            for field in [
                "safeguarding_flag",
                "police_called",
                "physical_intervention",
                "missing_from_home",
                "risk_of_exploitation",
            ]
        )

        emotional_tags: list[str] = []
        lowered = combined_text.lower()
        for marker in ["anxious", "dysregulated", "calm", "distressed", "withdrawn", "happy"]:
            if marker in lowered:
                emotional_tags.append(marker)

        relationship_tags: list[str] = []
        for marker in ["family", "mum", "dad", "staff", "friend", "professional"]:
            if marker in lowered:
                relationship_tags.append(marker)

        risk_tags: list[str] = []
        for marker in ["missing", "exploitation", "police", "harm", "injury", "restraint"]:
            if marker in lowered:
                risk_tags.append(marker)

        severity = "critical" if safeguarding and "injury" in lowered else "high" if safeguarding else "medium"

        event_at = (
            record.get("event_at")
            or record.get("incident_datetime")
            or record.get("note_date")
            or record.get("created_at")
            or datetime.utcnow().isoformat()
        )

        return OperationalEvent(
            event_id=f"{source_table}:{record.get('id')}",
            event_type=source_table.rstrip("s"),
            event_category="operational",
            young_person_id=record.get("young_person_id"),
            staff_id=record.get("staff_id"),
            home_id=record.get("home_id"),
            provider_id=record.get("provider_id"),
            title=str(record.get("title") or record.get("incident_type") or source_table.replace("_", " ").title()),
            summary=combined_text[:500],
            therapeutic_summary=(therapeutic.recommendations[0] if therapeutic.recommendations else combined_text[:300]),
            event_at=str(event_at),
            created_at=str(record.get("created_at") or datetime.utcnow().isoformat()),
            severity=severity,
            safeguarding=safeguarding,
            requires_review=safeguarding or therapeutic.rating == "needs_review",
            inspection_relevant=True,
            orb_visible=True,
            child_voice_present=therapeutic.child_voice_present,
            restorative_practice_present=therapeutic.reflection_present,
            evidence_count=int(record.get("evidence_count") or 0),
            workflow_state=str(record.get("workflow_status") or record.get("status") or "recorded"),
            source_table=source_table,
            source_id=str(record.get("id") or "unknown"),
            projection_tags=[therapeutic.rating],
            risk_tags=risk_tags,
            emotional_tags=emotional_tags,
            relationship_tags=relationship_tags,
        )


operational_event_intelligence_service = OperationalEventIntelligenceService()
