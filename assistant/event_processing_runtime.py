from __future__ import annotations

"""Event-driven operational processing runtime.

This module converts operational changes into runtime events, alerts and
workflow refresh recommendations. It is the first step toward ambient
operational intelligence.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


HIGH_PRIORITY_TERMS = {
    "missing",
    "police",
    "exploitation",
    "self-harm",
    "assault",
    "strategy meeting",
    "lado",
    "urgent",
}


@dataclass(frozen=True)
class OperationalEvent:
    event_type: str
    priority: str
    created_at: str
    citation_ref: str
    summary: str
    recommended_workflows: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class EventRuntimeResult:
    status: str
    event_count: int
    events: list[OperationalEvent] = field(default_factory=list)
    workflow_refreshes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _text(item: dict[str, Any]) -> str:
    return " ".join(
        _safe_string(item.get(key))
        for key in ("title", "excerpt", "summary", "description", "notes")
    ).lower()


def _priority(text: str) -> str:
    if any(term in text for term in HIGH_PRIORITY_TERMS):
        return "high"
    return "normal"


def _workflows(text: str) -> list[str]:
    workflows: list[str] = []
    if any(term in text for term in {"missing", "police", "self-harm", "exploitation"}):
        workflows.append("safeguarding_review")
    if any(term in text for term in {"chronology", "timeline"}):
        workflows.append("chronology")
    if any(term in text for term in {"inspection", "reg 45", "ofsted"}):
        workflows.append("inspection")
    if any(term in text for term in {"action", "overdue", "follow up"}):
        workflows.append("actions")
    return workflows or ["dashboard"]


def process_operational_events(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 30,
) -> EventRuntimeResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []

    if not evidence:
        return EventRuntimeResult(
            status="idle",
            event_count=0,
            warnings=["no_events_available"],
        )

    events: list[OperationalEvent] = []
    refreshes: list[str] = []

    for item in evidence[:limit]:
        if not isinstance(item, dict):
            continue

        text = _text(item)
        workflows = _workflows(text)
        refreshes.extend(workflows)

        events.append(
            OperationalEvent(
                event_type=_safe_string(item.get("record_type") or "event"),
                priority=_priority(text),
                created_at=datetime.utcnow().isoformat() + "Z",
                citation_ref=_safe_string(item.get("citation_ref")),
                summary=_safe_string(item.get("excerpt") or item.get("summary") or "Operational event"),
                recommended_workflows=workflows,
                warnings=[],
            )
        )

    return EventRuntimeResult(
        status="active",
        event_count=len(events),
        events=events,
        workflow_refreshes=sorted(set(refreshes)),
        warnings=[],
    )


def serialise_event_runtime(result: EventRuntimeResult) -> dict[str, Any]:
    return {
        "status": result.status,
        "event_count": result.event_count,
        "workflow_refreshes": result.workflow_refreshes,
        "warnings": result.warnings,
        "events": [
            {
                "event_type": event.event_type,
                "priority": event.priority,
                "created_at": event.created_at,
                "citation_ref": event.citation_ref,
                "summary": event.summary,
                "recommended_workflows": event.recommended_workflows,
                "warnings": event.warnings,
            }
            for event in result.events
        ],
    }
