from __future__ import annotations

"""Workflow persistence infrastructure for IndiCare OS assistant.

This module creates durable workflow payloads for safeguarding reviews,
chronology drafting, inspection preparation and operational coordination.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from assistant.operational_state import build_operational_state_snapshot, serialise_operational_state_snapshot


@dataclass(frozen=True)
class WorkflowRecord:
    workflow_id: str
    workflow_type: str
    scope_type: str
    scope_id: str
    status: str
    created_at: str
    updated_at: str
    assigned_role: str
    completion_percentage: int
    unresolved_items: list[str] = field(default_factory=list)
    citations: list[str] = field(default_factory=list)
    state_snapshot: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


WORKFLOW_COMPLETION_HINTS = {
    "chronology": 45,
    "safeguarding_review": 55,
    "inspection": 60,
    "actions": 50,
    "dashboard": 35,
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _completion(intent: str, warnings: list[str], unresolved_count: int) -> int:
    base = WORKFLOW_COMPLETION_HINTS.get(intent, 40)
    penalty = min(35, unresolved_count * 3 + len(warnings) * 2)
    return max(5, min(95, base - penalty))


def build_workflow_record(
    *,
    query: str,
    evidence_index: list[dict[str, Any]] | None,
    scope_type: str = "home",
    scope_id: str = "active-scope",
    role: str = "manager",
) -> WorkflowRecord:
    snapshot = serialise_operational_state_snapshot(
        build_operational_state_snapshot(
            query=query,
            evidence_index=evidence_index,
            scope_type=scope_type,
            scope_id=scope_id,
            role=role,
        )
    )

    runtime = snapshot.get("runtime") if isinstance(snapshot.get("runtime"), dict) else {}
    intent = _safe_string(runtime.get("intent") or snapshot.get("active_workflow") or "general")
    citations = runtime.get("citations") if isinstance(runtime.get("citations"), list) else []
    warnings = snapshot.get("warnings") if isinstance(snapshot.get("warnings"), list) else []

    unresolved_items: list[str] = []
    if snapshot.get("unresolved_alert_count", 0):
        unresolved_items.append("unresolved_operational_alerts")
    if snapshot.get("open_action_count", 0):
        unresolved_items.append("open_actions_require_follow_up")
    unresolved_items.extend(warnings[:10])

    completion = _completion(intent, warnings, len(unresolved_items))
    now = datetime.utcnow().isoformat() + "Z"

    return WorkflowRecord(
        workflow_id=f"{scope_type}:{scope_id}:{intent}",
        workflow_type=intent,
        scope_type=scope_type,
        scope_id=scope_id,
        status=snapshot.get("status", "active"),
        created_at=now,
        updated_at=now,
        assigned_role=role,
        completion_percentage=completion,
        unresolved_items=unresolved_items,
        citations=citations[:40],
        state_snapshot=snapshot,
        warnings=warnings,
    )


def serialise_workflow_record(record: WorkflowRecord) -> dict[str, Any]:
    return {
        "workflow_id": record.workflow_id,
        "workflow_type": record.workflow_type,
        "scope_type": record.scope_type,
        "scope_id": record.scope_id,
        "status": record.status,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "assigned_role": record.assigned_role,
        "completion_percentage": record.completion_percentage,
        "unresolved_items": record.unresolved_items,
        "citations": record.citations,
        "state_snapshot": record.state_snapshot,
        "warnings": record.warnings,
    }
