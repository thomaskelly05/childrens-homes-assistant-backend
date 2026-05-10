from __future__ import annotations

"""Role-aware rendering orchestration for IndiCare Assistant.

This module adapts runtime cards, warnings and workspace emphasis by role. It is
for UI/rendering orchestration only; it does not bypass permissions or expose
additional evidence.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.runtime_ui_payloads import build_runtime_workspace_payload, serialise_runtime_workspace_payload


ROLE_PROFILES = {
    "rsw": {
        "label": "Residential Support Worker",
        "emphasis": ["safeguarding", "handover", "actions", "recording"],
        "hide_cards": {"quality_score", "provider_benchmarking"},
    },
    "senior": {
        "label": "Senior / Shift Lead",
        "emphasis": ["handover", "alerts", "actions", "oversight"],
        "hide_cards": set(),
    },
    "manager": {
        "label": "Registered Manager",
        "emphasis": ["safeguarding", "oversight", "inspection", "actions", "quality"],
        "hide_cards": set(),
    },
    "ri": {
        "label": "Responsible Individual",
        "emphasis": ["provider", "quality", "inspection", "oversight", "safeguarding"],
        "hide_cards": set(),
    },
    "provider": {
        "label": "Provider / Operations",
        "emphasis": ["provider", "benchmarking", "quality", "safeguarding", "inspection"],
        "hide_cards": set(),
    },
}


@dataclass(frozen=True)
class RoleAwareWorkspace:
    role: str
    role_label: str
    workspace_type: str
    emphasis: list[str] = field(default_factory=list)
    visible_cards: list[dict[str, Any]] = field(default_factory=list)
    hidden_cards: list[dict[str, Any]] = field(default_factory=list)
    citation_drawer: list[dict[str, Any]] = field(default_factory=list)
    runtime: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _normalise_role(role: str) -> str:
    text = str(role or "manager").strip().lower()
    if text in {"residential support worker", "support worker"}:
        return "rsw"
    if text in {"shift lead", "deputy", "senior support worker"}:
        return "senior"
    if text in {"registered manager", "rm"}:
        return "manager"
    if text in {"responsible individual"}:
        return "ri"
    return text if text in ROLE_PROFILES else "manager"


def build_role_aware_workspace(
    *,
    query: str,
    evidence_index: list[dict[str, Any]] | None,
    role: str = "manager",
) -> RoleAwareWorkspace:
    role_key = _normalise_role(role)
    profile = ROLE_PROFILES[role_key]
    workspace = serialise_runtime_workspace_payload(
        build_runtime_workspace_payload(query=query, evidence_index=evidence_index, role=role_key)
    )

    hide_cards = profile["hide_cards"]
    visible: list[dict[str, Any]] = []
    hidden: list[dict[str, Any]] = []

    for card in workspace.get("cards", []) if isinstance(workspace.get("cards"), list) else []:
        card_type = str(card.get("card_type") or "")
        if card_type in hide_cards:
            hidden.append(card)
        else:
            visible.append(card)

    warnings = workspace.get("warnings", []) if isinstance(workspace.get("warnings"), list) else []
    if hidden:
        warnings = list(warnings) + ["some_cards_hidden_for_role_context"]

    return RoleAwareWorkspace(
        role=role_key,
        role_label=profile["label"],
        workspace_type=workspace.get("workspace_type", "general"),
        emphasis=list(profile["emphasis"]),
        visible_cards=visible,
        hidden_cards=hidden,
        citation_drawer=workspace.get("citation_drawer", []) if isinstance(workspace.get("citation_drawer"), list) else [],
        runtime=workspace.get("runtime", {}) if isinstance(workspace.get("runtime"), dict) else {},
        warnings=warnings,
    )


def serialise_role_aware_workspace(workspace: RoleAwareWorkspace) -> dict[str, Any]:
    return {
        "role": workspace.role,
        "role_label": workspace.role_label,
        "workspace_type": workspace.workspace_type,
        "emphasis": workspace.emphasis,
        "visible_cards": workspace.visible_cards,
        "hidden_cards": workspace.hidden_cards,
        "citation_drawer": workspace.citation_drawer,
        "runtime": workspace.runtime,
        "warnings": workspace.warnings,
    }
