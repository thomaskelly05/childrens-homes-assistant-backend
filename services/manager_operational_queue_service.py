from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ManagerQueueItem:
    category: str
    priority: str
    title: str
    reason: str
    source_table: str
    source_id: str
    young_person_id: int | None
    staff_id: int | None
    home_id: int | None
    provider_id: int | None
    recommended_action: str
    evidence_gap: bool = False
    child_voice_gap: bool = False
    safeguarding: bool = False

    def model_dump(self) -> dict[str, Any]:
        return self.__dict__


class ManagerOperationalQueueService:
    def build_from_events(self, events: list[dict[str, Any]]) -> dict[str, Any]:
        items: list[ManagerQueueItem] = []
        for event in events:
            items.extend(self._items_for_event(event))

        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        items = sorted(items, key=lambda item: priority_order.get(item.priority, 9))

        return {
            "ok": True,
            "total": len(items),
            "critical": sum(1 for item in items if item.priority == "critical"),
            "high": sum(1 for item in items if item.priority == "high"),
            "medium": sum(1 for item in items if item.priority == "medium"),
            "items": [item.model_dump() for item in items],
            "summary": self._summary(items),
        }

    def _items_for_event(self, event: dict[str, Any]) -> list[ManagerQueueItem]:
        items: list[ManagerQueueItem] = []
        source_table = str(event.get("source_table") or event.get("event_type") or "record")
        source_id = str(event.get("source_id") or event.get("id") or event.get("event_id") or "unknown")

        base = {
            "source_table": source_table,
            "source_id": source_id,
            "young_person_id": event.get("young_person_id"),
            "staff_id": event.get("staff_id"),
            "home_id": event.get("home_id"),
            "provider_id": event.get("provider_id"),
        }

        if event.get("safeguarding") or event.get("severity") in {"high", "critical"}:
            items.append(
                ManagerQueueItem(
                    category="safeguarding",
                    priority="critical" if event.get("severity") == "critical" else "high",
                    title="Safeguarding-linked record needs review",
                    reason="This record contains safeguarding or high-severity indicators.",
                    recommended_action="Review the record, confirm immediate actions, and ensure notifications/evidence are complete.",
                    safeguarding=True,
                    **base,
                )
            )

        if event.get("requires_review"):
            items.append(
                ManagerQueueItem(
                    category="manager_review",
                    priority="high" if event.get("safeguarding") else "medium",
                    title="Record requires manager review",
                    reason="The operational intelligence layer marked this record as needing oversight.",
                    recommended_action="Check analysis, child impact, actions, and whether sign-off is required.",
                    safeguarding=bool(event.get("safeguarding")),
                    **base,
                )
            )

        if not event.get("child_voice_present"):
            items.append(
                ManagerQueueItem(
                    category="recording_quality",
                    priority="medium",
                    title="Child voice appears weak or missing",
                    reason="The record does not appear to include the young person's wishes, feelings or voice.",
                    recommended_action="Ask the adult to add child voice where safe, appropriate and known, or explain why it was not possible.",
                    child_voice_gap=True,
                    **base,
                )
            )

        if int(event.get("evidence_count") or 0) == 0 and event.get("inspection_relevant", True):
            items.append(
                ManagerQueueItem(
                    category="evidence_gap",
                    priority="medium",
                    title="Inspection-relevant record has no linked evidence",
                    reason="The record appears relevant to inspection or oversight but has no linked evidence count.",
                    recommended_action="Link documents, chronology entries, actions, or manager review evidence.",
                    evidence_gap=True,
                    **base,
                )
            )

        if event.get("workflow_state") in {"draft", "submitted", "awaiting_review"}:
            items.append(
                ManagerQueueItem(
                    category="workflow",
                    priority="medium",
                    title="Workflow is not fully completed",
                    reason=f"Record workflow state is {event.get('workflow_state')}.",
                    recommended_action="Progress the workflow to review, sign-off or completion as required by policy.",
                    **base,
                )
            )

        return items

    def _summary(self, items: list[ManagerQueueItem]) -> str:
        if not items:
            return "No immediate manager oversight items were generated from the supplied events."
        critical = sum(1 for item in items if item.priority == "critical")
        high = sum(1 for item in items if item.priority == "high")
        evidence = sum(1 for item in items if item.evidence_gap)
        child_voice = sum(1 for item in items if item.child_voice_gap)
        return (
            f"Manager queue contains {len(items)} item(s): {critical} critical, {high} high, "
            f"{evidence} evidence gap(s), and {child_voice} child voice gap(s)."
        )


manager_operational_queue_service = ManagerOperationalQueueService()
