from __future__ import annotations

from typing import Any

from services.document_review_scheduler import document_review_scheduler
from services.document_gap_analysis_service import document_gap_analysis_service
from services.home_document_catalogue_service import home_document_catalogue_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, evidence_gap, review_prompt, safe_payload


class OfstedDocumentReadinessService:
    """Inspection readiness intelligence for required home, child and staff documents."""

    def readiness(
        self,
        *,
        home_id: int | str | None = None,
        existing_documents: list[dict[str, Any]] | None = None,
        child_ids: list[int | str] | None = None,
        staff_ids: list[int | str] | None = None,
    ) -> dict[str, Any]:
        catalogue = home_document_catalogue_service.catalogue(home_id=home_id, child_ids=child_ids, staff_ids=staff_ids)
        existing_by_type = {str(doc.get("document_type") or doc.get("title") or "").lower(): doc for doc in existing_documents or []}
        checked = [self._merge(item, existing_by_type) for item in catalogue["items"]]
        gap_analysis = document_gap_analysis_service.analyse(
            home_id=home_id,
            existing_documents=existing_documents,
            child_ids=child_ids,
            staff_ids=staff_ids,
        )
        schedule = document_review_scheduler.schedule(documents=checked)
        missing = [item for item in checked if item["missing_incomplete_status"] == "missing"]
        weak = [item for item in checked if item["evidence_sufficiency"] in {"weak", "limited"}]
        oversight_missing = [item for item in checked if item["qa_state"] == "missing" or item["signoff_state"] == "missing"]
        overdue = [item for item in schedule if item.get("review_required")]
        payload = {
            "summary": "records indicate document readiness intelligence is available for calm manager review.",
            "home_id": home_id,
            "catalogue_counts": catalogue["counts"],
            "documents": checked,
            "document_gap_analysis": gap_analysis,
            "review_schedule": schedule,
            "inspection_readiness_intelligence": [
                *[self._message(item, "Review may be helpful; this document appears overdue.") for item in overdue],
                *[self._message(item, "Evidence appears weak.") for item in weak[:10]],
                *[self._message(item, "Child voice evidence is limited.") for item in checked if "Child Voice" in str(item.get("document_type"))],
                *[self._message(item, "Leadership oversight evidence is missing.") for item in oversight_missing[:10]],
            ],
            "overdue_review_tracking": [self._message(item, "Review may be helpful; review date appears overdue.") for item in overdue[:10]],
            "weak_action_outcome_tracking": [
                self._message(item, "Follow-up appears incomplete; consider linking action outcome evidence.")
                for item in checked
                if item.get("linked_actions") and not item.get("linked_reports")
            ][:10],
            "inspection_timeline_summary": self._timeline_summary(checked),
            "what_has_improved": [
                self._message(item, "Visible evidence suggests this area has improved; source review remains required.")
                for item in checked
                if str(item.get("evidence_sufficiency")).lower() == "strong"
            ][:10],
            "what_still_needs_oversight": [
                *[self._message(item, "Limited evidence found; consider expanding before inspection sampling.") for item in weak[:10]],
                *[self._message(item, "Leadership review may be helpful before sign-off.") for item in oversight_missing[:10]],
            ][:12],
            "evidence_gaps": [
                evidence_gap("missing-documents", f"no evidence found: {len(missing)} required document entries appear missing."),
                evidence_gap("weak-evidence", f"records indicate {len(weak)} document entries have limited evidence sufficiency."),
            ],
            "manager_review_prompts": [
                review_prompt("document-readiness", "review recommended: sample missing, weak and oversight-missing document evidence."),
                review_prompt("reg44-reg45-link", "consider checking Reg 44 and Reg 45 evidence links against the catalogue."),
            ],
            "supportive_review_copy": [
                "Explain the evidence trail before changing the judgement.",
                "Treat missing dates as prompts for review, not automatic failure.",
                "Focus on practical next actions: owner, source record, review date and outcome.",
            ],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        return safe_payload(payload)

    def _merge(self, item: dict[str, Any], existing_by_type: dict[str, dict[str, Any]]) -> dict[str, Any]:
        existing = existing_by_type.get(str(item.get("document_type", "")).lower())
        if not existing:
            return {**item, "missing_incomplete_status": "missing", "evidence_sufficiency": "weak", "qa_state": "missing", "signoff_state": "missing"}
        return {
            **item,
            "last_reviewed": existing.get("last_reviewed") or existing.get("lastReviewed") or existing.get("reviewDate"),
            "next_review": existing.get("next_review") or existing.get("nextReview") or existing.get("reviewDate"),
            "missing_incomplete_status": existing.get("missing_incomplete_status") or existing.get("status") or "present",
            "evidence_sufficiency": existing.get("evidence_sufficiency") or existing.get("evidenceSufficiency") or "limited",
            "qa_state": existing.get("qa_state") or existing.get("qaState") or "not_checked",
            "signoff_state": existing.get("signoff_state") or existing.get("signoffState") or "not_checked",
            "linked_chronology": existing.get("linked_chronology") or [],
            "linked_actions": existing.get("linked_actions") or [],
            "linked_incidents": existing.get("linked_incidents") or [],
            "linked_safeguarding": existing.get("linked_safeguarding") or [],
            "linked_reports": existing.get("linked_reports") or [],
        }

    def _message(self, item: dict[str, Any], message: str) -> dict[str, Any]:
        return {
            "document_type": item.get("document_type"),
            "summary": message,
            "language": "review recommended",
            "evidence_strength": item.get("evidence_sufficiency", "limited"),
        }

    def _timeline_summary(self, items: list[dict[str, Any]]) -> dict[str, Any]:
        reviewed = [item for item in items if item.get("last_reviewed")]
        upcoming = [item for item in items if item.get("next_review")]
        return {
            "reviewed_count": len(reviewed),
            "next_review_count": len(upcoming),
            "summary": "Inspection timeline uses visible review dates only; missing dates are treated as review prompts, not failures.",
        }


ofsted_document_readiness_service = OfstedDocumentReadinessService()
