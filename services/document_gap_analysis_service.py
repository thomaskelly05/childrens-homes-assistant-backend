from __future__ import annotations

from datetime import date
from typing import Any

from services.home_document_catalogue_service import home_document_catalogue_service


class DocumentGapAnalysisService:
    """Checks required child, home and staff documents against the catalogue."""

    def analyse(
        self,
        *,
        home_id: int | str | None = None,
        existing_documents: list[dict[str, Any]] | None = None,
        child_ids: list[int | str] | None = None,
        staff_ids: list[int | str] | None = None,
    ) -> dict[str, Any]:
        catalogue = home_document_catalogue_service.catalogue(home_id=home_id, child_ids=child_ids, staff_ids=staff_ids)
        existing = {self._key(doc): doc for doc in existing_documents or []}
        checked = [self._check(item, existing.get(self._key(item))) for item in catalogue["items"]]
        missing = [item for item in checked if item["exists"] is False]
        incomplete = [item for item in checked if item["complete"] is False and item["exists"] is True]
        stale = [item for item in checked if item["stale_evidence"]]
        return {
            "summary": "Document gap analysis is ready for calm manager review.",
            "home_id": home_id,
            "documents": checked,
            "missing_evidence": missing,
            "incomplete_evidence": incomplete,
            "stale_evidence": stale,
            "action_required": [self._action(item) for item in [*missing, *incomplete, *stale]][:30],
            "manager_oversight_required": bool(missing or incomplete or stale),
            "guardrails": ["Missing documents are review prompts, not automatic inspection judgements.", "Manager review/sign-off remains required."],
        }

    def _check(self, catalogue_item: dict[str, Any], existing: dict[str, Any] | None) -> dict[str, Any]:
        exists = existing is not None
        complete = exists and str(existing.get("status") or existing.get("missing_incomplete_status") or "present").lower() not in {"missing", "incomplete", "draft"}
        last_reviewed = (existing or {}).get("last_reviewed") or (existing or {}).get("lastReviewed") or catalogue_item.get("last_reviewed")
        next_review = (existing or {}).get("next_review") or (existing or {}).get("nextReview") or catalogue_item.get("next_review")
        stale = self._stale(next_review)
        return {
            "document_type": catalogue_item.get("document_type"),
            "category": catalogue_item.get("category"),
            "exists": exists,
            "complete": complete,
            "last_reviewed": last_reviewed,
            "next_review": next_review,
            "owner": (existing or {}).get("owner") or catalogue_item.get("owner"),
            "linked_evidence": (existing or {}).get("linked_evidence") or catalogue_item.get("evidence_requirements") or [],
            "linked_regulation": catalogue_item.get("linked_regulation") or [],
            "linked_quality_standard": catalogue_item.get("linked_standard") or [],
            "sccif_relevance": self._sccif(catalogue_item),
            "inspection_relevance": "high",
            "stale_evidence": stale,
            "action_required": "ready for manager review" if exists and complete and not stale else "review recommended",
        }

    def _key(self, document: dict[str, Any]) -> str:
        return str(document.get("document_type") or document.get("title") or "").strip().lower()

    def _stale(self, next_review: Any) -> bool:
        if not next_review:
            return False
        try:
            return date.fromisoformat(str(next_review)[:10]) < date.today()
        except ValueError:
            return False

    def _sccif(self, item: dict[str, Any]) -> list[str]:
        standards = " ".join(item.get("linked_standard") or []).lower()
        if "protection" in standards:
            return ["how well children are helped and protected", "safeguarding culture"]
        if "leadership" in standards:
            return ["effectiveness of leaders and managers", "management oversight"]
        return ["overall experiences and progress of children", "records, monitoring and review"]

    def _action(self, item: dict[str, Any]) -> dict[str, Any]:
        return {
            "document_type": item["document_type"],
            "owner": item["owner"],
            "action": item["action_required"],
            "language": "review recommended",
        }


document_gap_analysis_service = DocumentGapAnalysisService()
