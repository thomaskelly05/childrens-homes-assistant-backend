from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from services.risk_intelligence_language import review_prompt, safe_payload


class LocalityReviewScheduler:
    """Creates review cadence suggestions for home and child locality context."""

    def schedule(
        self,
        *,
        locations: list[dict[str, Any]],
        last_reviewed_at: str | None = None,
        review_interval_days: int = 30,
    ) -> list[dict[str, Any]]:
        now = datetime.now(UTC)
        last_review = self._parse(last_reviewed_at)
        due_at = (last_review or now) + timedelta(days=review_interval_days)
        schedule = [
            {
                "schedule_id": "home-locality-assessment",
                "review_type": "home locality assessment",
                "due_at": due_at.date().isoformat(),
                "review_required": due_at <= now or any(item.get("review_required") for item in locations),
                "prompt": "review recommended: refresh locality assessment and evidence links.",
            }
        ]
        for location in locations:
            if location.get("review_required") or location.get("risk_level") in {"review", "priority_review"}:
                schedule.append(
                    {
                        "schedule_id": f"location-{location.get('location_id')}",
                        "review_type": "location context review",
                        "location_id": location.get("location_id"),
                        "due_at": now.date().isoformat(),
                        "review_required": True,
                        "prompt": f"consider checking {location.get('name')} against current source records and protective factors.",
                    }
                )
        return safe_payload(schedule)

    def prompts(self, *, locations: list[dict[str, Any]]) -> list[dict[str, str]]:
        prompts = [
            review_prompt(
                "locality-evidence-check",
                "review recommended: confirm every locality concern links to a current source record and protective factor.",
            )
        ]
        if any(item.get("category") in {"train station", "bus station", "transport route"} for item in locations):
            prompts.append(review_prompt("transport-context", "consider checking transport links, return routes and staff response plans."))
        if any(item.get("linked_missing_episodes") for item in locations):
            prompts.append(review_prompt("missing-return-context", "records indicate missing return locations need manager review."))
        return prompts

    def _parse(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None


locality_review_scheduler = LocalityReviewScheduler()
