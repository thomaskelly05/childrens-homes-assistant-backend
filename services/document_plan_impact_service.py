"""Document plan impact extraction foundation — reviewable suggestions only."""

from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

from schemas.child_archive import ChildArchiveRecord
from schemas.plan_impact import PlanImpactSuggestion
from services.child_archive_service import child_archive_service
from services.plan_impact_suggestion_service import plan_impact_suggestion_service

DOCUMENT_PLAN_MAP: dict[str, list[tuple[str, str]]] = {
    "lac_review": [
        ("care_plan", "Review care plan goals and ambitions from LAC review"),
        ("care_plan", "Capture LAC review actions for adult follow-up"),
    ],
    "lac-review": [
        ("care_plan", "Review care plan goals and ambitions from LAC review"),
    ],
    "pep": [
        ("education_plan", "Review PEP education targets and support"),
    ],
    "reg44": [
        ("other", "Review Reg 44 improvement actions and leadership oversight"),
    ],
    "reg44-report": [
        ("other", "Review Reg 44 improvement actions"),
    ],
    "reg45": [
        ("other", "Review Reg 45 quality improvement actions"),
    ],
    "care_plan": [
        ("care_plan", "Review care plan following signed-off document"),
    ],
    "health_report": [
        ("health_plan", "Review health plan following clinical report"),
    ],
    "risk_assessment": [
        ("risk_assessment", "Review risk assessment following signed-off document"),
    ],
}


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


class DocumentPlanImpactService:
    def extract_targets_from_text(self, text: str) -> list[str]:
        if not text:
            return []
        targets: list[str] = []
        for line in text.splitlines():
            stripped = line.strip()
            if re.match(r"^[-•*]?\s*(goal|target|action|recommendation)\s*[:\-]", stripped, re.I):
                targets.append(stripped[:200])
            elif re.match(r"^\d+[\.)]\s+", stripped):
                targets.append(stripped[:200])
        return targets[:20]

    def process_signed_off_document(
        self,
        document: dict[str, Any],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        archive = child_archive_service.create_from_document(document, current_user, conn=conn)
        if not archive:
            return {"archive_record_id": None, "plan_impact_ids": [], "warnings": ["Document not archived — draft or missing child."]}

        doc_type = _text(document.get("document_type") or document.get("type")).lower().replace(" ", "_")
        impacts = plan_impact_suggestion_service.analyse_archive_record(archive, current_user, conn=conn)

        extracted_text = _text(document.get("extracted_text") or document.get("body") or document.get("summary"))
        if doc_type in DOCUMENT_PLAN_MAP and extracted_text:
            for target_line in self.extract_targets_from_text(extracted_text)[:5]:
                plan_type = DOCUMENT_PLAN_MAP[doc_type][0][0]
                extra = PlanImpactSuggestion(
                    id=f"plan_impact_{uuid4().hex[:14]}",
                    child_id=archive.child_id,
                    home_id=archive.home_id,
                    source_type=doc_type,
                    source_id=archive.source_id,
                    archive_record_id=archive.id,
                    suggested_plan_type=plan_type,  # type: ignore[arg-type]
                    title="Extracted target (review required)",
                    safe_summary=target_line,
                    suggested_update="Review extracted target before updating any plan.",
                    review_required=True,
                    status="suggested",
                    metadata={"extracted": True, "auto_update_allowed": False},
                )
                plan_impact_suggestion_service._store(extra, conn=conn)
                impacts.append(extra)

        impact_ids = [s.id for s in impacts]
        if impact_ids:
            child_archive_service.link_plan_impacts(archive.id, impact_ids, current_user, conn=conn)

        from services.child_chronology_story_service import child_chronology_story_service

        event = child_chronology_story_service.create_event_from_archive(archive, current_user, conn=conn)
        if event.archive_record_id and not archive.chronology_event_id:
            child_archive_service.link_chronology(
                archive.id,
                event.id,
                current_user,
                conn=conn,
            )

        return {
            "archive_record_id": archive.id,
            "plan_impact_ids": impact_ids,
            "chronology_event_id": event.id,
            "warnings": ["All extractions require adult review — plans are not updated automatically."],
        }


document_plan_impact_service = DocumentPlanImpactService()
