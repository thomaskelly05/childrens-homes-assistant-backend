"""Pending human review queue when trusted sources change."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

_PROTECTED_TYPES = frozenset(
    {"statutory_guidance", "legislation", "inspection_framework", "clinical_guidance", "local_safeguarding"}
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class SourceChangeReviewService:
    def __init__(self) -> None:
        self._pending: dict[str, dict[str, Any]] = {}

    def create_pending_review(
        self,
        *,
        source_id: str,
        old_hash: str,
        new_hash: str,
        headers: dict[str, str] | None = None,
        source_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        meta = source_metadata or {}
        stype = str(meta.get("source_type") or "")
        review_id = str(uuid.uuid4())
        requires_human = bool(
            meta.get("human_approval_required")
            or stype in _PROTECTED_TYPES
            or not meta.get("auto_apply_allowed", True)
        )
        review = {
            "review_id": review_id,
            "source_id": source_id,
            "status": "pending",
            "old_hash": old_hash,
            "new_hash": new_hash,
            "headers": headers or {},
            "created_at": _utc_now_iso(),
            "human_approval_required": requires_human,
            "auto_apply_allowed": False,
            "trust_tier": meta.get("trust_tier"),
            "title": meta.get("title"),
        }
        self._pending[review_id] = review
        return review

    def get_review(self, review_id: str) -> dict[str, Any] | None:
        return self._pending.get(review_id)

    def list_pending(self) -> list[dict[str, Any]]:
        return [r for r in self._pending.values() if r.get("status") == "pending"]

    def approve(self, review_id: str, *, approver: str, notes: str = "") -> dict[str, Any] | None:
        review = self._pending.get(review_id)
        if not review:
            return None
        review["status"] = "approved"
        review["approved_by"] = approver
        review["approved_at"] = _utc_now_iso()
        review["notes"] = notes
        return review

    def reject(self, review_id: str, *, rejector: str, notes: str = "") -> dict[str, Any] | None:
        review = self._pending.get(review_id)
        if not review:
            return None
        review["status"] = "rejected"
        review["rejected_by"] = rejector
        review["rejected_at"] = _utc_now_iso()
        review["notes"] = notes
        return review


source_change_review_service = SourceChangeReviewService()
