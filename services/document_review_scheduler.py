from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from services.risk_intelligence_language import review_prompt, safe_payload


class DocumentReviewScheduler:
    """Schedules document reviews from catalogue metadata."""

    def schedule(self, *, documents: list[dict[str, Any]], reference_date: str | None = None) -> list[dict[str, Any]]:
        now = self._parse(reference_date) or datetime.now(UTC)
        schedule = []
        for document in documents:
            next_review = self._parse(document.get("next_review"))
            if not next_review:
                next_review = now + self._interval(document.get("review_frequency"))
            overdue = next_review.date() < now.date()
            schedule.append(
                {
                    "document_type": document.get("document_type"),
                    "category": document.get("category"),
                    "owner": document.get("owner"),
                    "next_review": next_review.date().isoformat(),
                    "review_required": overdue or document.get("missing_incomplete_status") in {"missing", "incomplete"},
                    "prompt": "review recommended: document appears overdue or incomplete." if overdue else "consider checking review evidence and signoff.",
                }
            )
        return safe_payload(schedule)

    def prompts_for_overdue(self, *, documents: list[dict[str, Any]]) -> list[dict[str, str]]:
        return [
            review_prompt(f"document-{index}", f"review recommended: {document.get('document_type')} appears overdue or incomplete.")
            for index, document in enumerate(documents)
            if document.get("review_required")
        ]

    def _interval(self, frequency: str | None) -> timedelta:
        text = str(frequency or "").lower()
        if "monthly" in text:
            return timedelta(days=30)
        if "six" in text:
            return timedelta(days=183)
        return timedelta(days=365)

    def _parse(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            return None


document_review_scheduler = DocumentReviewScheduler()
