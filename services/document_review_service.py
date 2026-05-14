from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from schemas.document_templates import DocumentStatus


TRANSITIONS = {
    DocumentStatus.DRAFT.value: {DocumentStatus.SUBMITTED.value, DocumentStatus.AUTOSAVED.value, DocumentStatus.ARCHIVED.value},
    DocumentStatus.AUTOSAVED.value: {DocumentStatus.DRAFT.value, DocumentStatus.SUBMITTED.value, DocumentStatus.ARCHIVED.value},
    DocumentStatus.SUBMITTED.value: {DocumentStatus.UNDER_REVIEW.value, DocumentStatus.AMENDMENT_REQUESTED.value, DocumentStatus.APPROVED.value, DocumentStatus.ESCALATED.value},
    DocumentStatus.UNDER_REVIEW.value: {DocumentStatus.AMENDMENT_REQUESTED.value, DocumentStatus.APPROVED.value, DocumentStatus.ESCALATED.value},
    DocumentStatus.AMENDMENT_REQUESTED.value: {DocumentStatus.DRAFT.value, DocumentStatus.SUBMITTED.value, DocumentStatus.ESCALATED.value},
    DocumentStatus.ESCALATED.value: {DocumentStatus.UNDER_REVIEW.value, DocumentStatus.APPROVED.value, DocumentStatus.AMENDMENT_REQUESTED.value},
    DocumentStatus.APPROVED.value: {DocumentStatus.ARCHIVED.value},
    DocumentStatus.ARCHIVED.value: set(),
}


class DocumentReviewService:
    """Review state machine for manager QA and sign-off."""

    def transition(self, *, document: dict[str, Any], target_status: str, current_user: dict[str, Any], comment: str | None = None) -> dict[str, Any]:
        current = str(document.get("status") or DocumentStatus.DRAFT.value)
        target = self.normalise_action(target_status)
        if target not in TRANSITIONS.get(current, set()) and target != current:
            raise HTTPException(status_code=400, detail=f"Cannot move document from {current} to {target}.")
        event = {
            "from": current,
            "to": target,
            "comment": comment,
            "actor_user_id": current_user.get("id") or current_user.get("user_id"),
            "actor_role": current_user.get("role"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        review = dict(document.get("review") or {})
        timeline = list(review.get("timeline") or [])
        timeline.append(event)
        if comment:
            review.setdefault("comments", []).append(event)
        review["status"] = target
        review["timeline"] = timeline
        return {"status": target, "review": review, "event": event}

    def normalise_action(self, action: str) -> str:
        return {
            "submit": DocumentStatus.SUBMITTED.value,
            "start_review": DocumentStatus.UNDER_REVIEW.value,
            "request_amendment": DocumentStatus.AMENDMENT_REQUESTED.value,
            "request_changes": DocumentStatus.AMENDMENT_REQUESTED.value,
            "approve": DocumentStatus.APPROVED.value,
            "escalate": DocumentStatus.ESCALATED.value,
            "archive": DocumentStatus.ARCHIVED.value,
        }.get(str(action or "").strip().lower(), str(action or DocumentStatus.UNDER_REVIEW.value))


document_review_service = DocumentReviewService()
