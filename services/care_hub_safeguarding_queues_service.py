from __future__ import annotations

from typing import Any


class CareHubSafeguardingQueuesService:
    """Split safeguarding pressure into first-class operational queues for Care Hub."""

    QUEUE_KEYS = (
        "missing_episode_queue",
        "reg_40_queue",
        "restraint_physical_intervention_queue",
        "allegation_queue",
        "medication_risk_queue",
    )

    def build_from_feed(self, feed: dict[str, Any], *, limit: int = 20) -> dict[str, Any]:
        events = feed.get("events") or []
        queues: dict[str, list[dict[str, Any]]] = {key: [] for key in self.QUEUE_KEYS}

        for event in events:
            text = " ".join(
                str(event.get(field) or "")
                for field in ("title", "summary", "therapeutic_summary", "event_type", "source_table")
            ).lower()
            risk_tags = [str(tag).lower() for tag in (event.get("risk_tags") or [])]
            base = {
                "event_id": event.get("event_id"),
                "young_person_id": event.get("young_person_id"),
                "home_id": event.get("home_id"),
                "title": event.get("title"),
                "summary": event.get("summary"),
                "severity": event.get("severity"),
                "event_at": event.get("event_at"),
                "source_table": event.get("source_table"),
                "source_id": event.get("source_id"),
            }

            if event.get("source_table") == "missing_episodes" or "missing" in risk_tags or "missing" in text:
                queues["missing_episode_queue"].append({**base, "queue_reason": "Missing-from-home episode or marker in operational feed."})
            if any(marker in text for marker in ("reg 40", "reg40", "serious incident", "notifiable")) or "reg_40" in risk_tags:
                queues["reg_40_queue"].append({**base, "queue_reason": "Reg 40 or serious incident notification marker detected."})
            if any(marker in text for marker in ("restraint", "physical intervention", "hold")) or "restraint" in risk_tags:
                queues["restraint_physical_intervention_queue"].append(
                    {**base, "queue_reason": "Restraint or physical intervention marker requires review."}
                )
            if any(marker in text for marker in ("allegation", "lado", "abuse allegation")):
                queues["allegation_queue"].append({**base, "queue_reason": "Allegation or LADO-related marker detected."})
            if event.get("source_table") in {"health_records"} or any(
                marker in text for marker in ("medication", "medicine", "missed dose", "refused medication", "controlled drug")
            ):
                queues["medication_risk_queue"].append({**base, "queue_reason": "Medication or health risk marker in operational feed."})

        for key in self.QUEUE_KEYS:
            queues[key] = queues[key][:limit]

        summary = {key: len(items) for key, items in queues.items()}
        return {
            "ok": True,
            "summary": summary,
            "total": sum(summary.values()),
            "queues": queues,
        }


care_hub_safeguarding_queues_service = CareHubSafeguardingQueuesService()
