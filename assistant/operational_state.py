from __future__ import annotations

"""Persistent operational state for IndiCare OS assistant.

This module builds a compact state snapshot for the active operational context.
It is designed for frontend workspaces and runtime orchestration. It stores
workflow/status metadata only; OS evidence remains scoped and citation-led.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from assistant.operational_runtime import run_operational_runtime, serialise_operational_runtime


@dataclass(frozen=True)
class OperationalStateSnapshot:
    state_id: str
    scope_type: str
    scope_id: str
    active_workflow: str
    status: str
    updated_at: str
    unresolved_alert_count: int
    open_action_count: int
    citation_count: int
    runtime: dict[str, Any] = field(default_factory=dict)
    context_markers: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _status_from_runtime(runtime: dict[str, Any]) -> str:
    warnings = runtime.get("warnings") if isinstance(runtime.get("warnings"), list) else []
    modules = runtime.get("modules") if isinstance(runtime.get("modules"), dict) else {}
    alerts = modules.get("alerts") if isinstance(modules.get("alerts"), dict) else {}
    alert_level = _safe_string(alerts.get("alert_level"))
    if alert_level in {"critical", "high"}:
        return "high_attention"
    if warnings:
        return "monitoring_required"
    return "active"


def build_operational_state_snapshot(
    *,
    query: str,
    evidence_index: list[dict[str, Any]] | None,
    scope_type: str = "home",
    scope_id: str = "active-scope",
    role: str = "manager",
    assistant_surface: str = "os_embedded",
) -> OperationalStateSnapshot:
    runtime_result = run_operational_runtime(
        query=query,
        evidence_index=evidence_index,
        role=role,
        assistant_surface=assistant_surface,
        scope_type=scope_type,
    )
    runtime = serialise_operational_runtime(runtime_result)
    modules = runtime.get("modules") if isinstance(runtime.get("modules"), dict) else {}
    alerts = modules.get("alerts") if isinstance(modules.get("alerts"), dict) else {}
    actions = modules.get("actions") if isinstance(modules.get("actions"), dict) else {}

    unresolved_alert_count = len(alerts.get("alerts", [])) if isinstance(alerts.get("alerts"), list) else 0
    open_action_count = int(actions.get("open_count") or 0) if isinstance(actions, dict) else 0
    citations = runtime.get("citations") if isinstance(runtime.get("citations"), list) else []

    return OperationalStateSnapshot(
        state_id=f"{scope_type}:{scope_id}:{runtime.get('intent', 'general')}",
        scope_type=scope_type,
        scope_id=scope_id,
        active_workflow=runtime.get("intent", "general_answer"),
        status=_status_from_runtime(runtime),
        updated_at=datetime.utcnow().isoformat() + "Z",
        unresolved_alert_count=unresolved_alert_count,
        open_action_count=open_action_count,
        citation_count=len(citations),
        runtime=runtime,
        context_markers={
            "role": role,
            "assistant_surface": assistant_surface,
            "response_style": runtime.get("plan", {}).get("response_style") if isinstance(runtime.get("plan"), dict) else "general",
        },
        warnings=runtime.get("warnings", []) if isinstance(runtime.get("warnings"), list) else [],
    )


def serialise_operational_state_snapshot(snapshot: OperationalStateSnapshot) -> dict[str, Any]:
    return {
        "state_id": snapshot.state_id,
        "scope_type": snapshot.scope_type,
        "scope_id": snapshot.scope_id,
        "active_workflow": snapshot.active_workflow,
        "status": snapshot.status,
        "updated_at": snapshot.updated_at,
        "unresolved_alert_count": snapshot.unresolved_alert_count,
        "open_action_count": snapshot.open_action_count,
        "citation_count": snapshot.citation_count,
        "runtime": snapshot.runtime,
        "context_markers": snapshot.context_markers,
        "warnings": snapshot.warnings,
    }


def build_operational_state_prompt_block(snapshot: OperationalStateSnapshot) -> str:
    lines = [
        "OPERATIONAL STATE CONTEXT",
        "Use this as current scoped operational state. Do not treat it as long-term memory or source evidence.",
        f"State: {snapshot.state_id}. Workflow: {snapshot.active_workflow}. Status: {snapshot.status}.",
        f"Alerts: {snapshot.unresolved_alert_count}. Open actions: {snapshot.open_action_count}. Citations: {snapshot.citation_count}.",
    ]
    if snapshot.warnings:
        lines.append("Warnings:")
        for warning in snapshot.warnings[:10]:
            lines.append(f"- {warning}")
    return "\n".join(lines).strip()
