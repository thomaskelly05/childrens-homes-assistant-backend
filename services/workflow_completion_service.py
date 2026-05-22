from __future__ import annotations

from typing import Any


INCOMPLETE_WORKFLOW_STATES = {"draft", "submitted", "awaiting_review"}


class WorkflowCompletionService:
    """Tracks workflow health from operational intelligence events."""

    def analyse(
        self,
        *,
        events: list[dict[str, Any]],
        manager_queue: dict[str, Any] | None = None,
        inspection: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        manager_queue = manager_queue or {}
        inspection = inspection or {}
        queue_items = manager_queue.get("items") or []

        incomplete_workflows = [
            event for event in events if event.get("workflow_state") in INCOMPLETE_WORKFLOW_STATES
        ]
        unsigned_records = [
            event
            for event in events
            if event.get("workflow_state") in {"submitted", "awaiting_review"}
            or event.get("requires_review")
        ]
        overdue_manager_reviews = [item for item in queue_items if item.get("category") == "manager_review"]
        missing_evidence = [item for item in queue_items if item.get("evidence_gap")]
        weak_child_voice = [item for item in queue_items if item.get("child_voice_gap")]
        missing_restorative = [
            event for event in events if not event.get("restorative_practice_present") and event.get("safeguarding")
        ]
        safeguarding_follow_up_gaps = [
            item for item in queue_items if item.get("safeguarding") and item.get("category") in {"safeguarding", "manager_review"}
        ]

        total = max(1, len(events))
        completed = len([event for event in events if event.get("workflow_state") not in INCOMPLETE_WORKFLOW_STATES])
        workflow_health_pct = round((completed / total) * 100)
        operational_completion_pct = round(
            ((total - len(incomplete_workflows) - len(missing_evidence)) / total) * 100
        )
        operational_completion_pct = max(0, min(100, operational_completion_pct))

        inspection_pressure = len(inspection.get("concerns") or [])
        inspection_vulnerability_pct = max(
            0,
            min(100, round((inspection_pressure / max(1, len(events))) * 100)),
        )

        gaps = {
            "incomplete_workflows": len(incomplete_workflows),
            "unsigned_records": len(unsigned_records),
            "overdue_manager_reviews": len(overdue_manager_reviews),
            "missing_evidence": len(missing_evidence),
            "weak_child_voice": len(weak_child_voice),
            "missing_restorative_reflection": len(missing_restorative),
            "safeguarding_follow_up_gaps": len(safeguarding_follow_up_gaps),
        }

        return {
            "ok": True,
            "workflow_health_pct": workflow_health_pct,
            "operational_completion_pct": operational_completion_pct,
            "inspection_vulnerability_pct": inspection_vulnerability_pct,
            "gaps": gaps,
            "items": {
                "incomplete_workflows": [self._item(event) for event in incomplete_workflows[:10]],
                "unsigned_records": [self._item(event) for event in unsigned_records[:10]],
                "overdue_manager_reviews": overdue_manager_reviews[:10],
                "missing_evidence": missing_evidence[:10],
                "weak_child_voice": weak_child_voice[:10],
                "missing_restorative_reflection": [self._item(event) for event in missing_restorative[:10]],
                "safeguarding_follow_up_gaps": safeguarding_follow_up_gaps[:10],
            },
            "summary": self._summary(workflow_health_pct, gaps),
        }

    def _item(self, event: dict[str, Any]) -> dict[str, Any]:
        return {
            "source_table": event.get("source_table"),
            "source_id": event.get("source_id"),
            "young_person_id": event.get("young_person_id"),
            "workflow_state": event.get("workflow_state"),
            "title": event.get("title"),
        }

    def _summary(self, workflow_health_pct: int, gaps: dict[str, int]) -> str:
        total_gaps = sum(gaps.values())
        if total_gaps == 0:
            return f"Workflow health is {workflow_health_pct}% with no immediate completion gaps detected."
        return (
            f"Workflow health is {workflow_health_pct}% with {total_gaps} operational completion gap indicator(s) "
            "across workflows, evidence, child voice and safeguarding follow-up."
        )


workflow_completion_service = WorkflowCompletionService()
