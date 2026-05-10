from __future__ import annotations

"""Runtime UI payload builders for IndiCare OS assistant.

These payloads are designed for frontend orchestration. They standardise card
and citation drawer structures so the UI can behave like a true Copilot
workspace rather than a plain chat renderer.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.operational_runtime import run_operational_runtime, serialise_operational_runtime


@dataclass(frozen=True)
class CitationDrawerItem:
    citation_ref: str
    title: str
    record_type: str
    excerpt: str
    chronology_position: str
    linked_actions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RuntimeUICard:
    card_type: str
    title: str
    priority: str
    summary: str
    citations: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RuntimeWorkspacePayload:
    workspace_type: str
    runtime: dict[str, Any]
    cards: list[RuntimeUICard] = field(default_factory=list)
    citation_drawer: list[CitationDrawerItem] = field(default_factory=list)
    workspace_layout: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _priority(intent: str) -> str:
    if intent in {"safeguarding_review", "inspection"}:
        return "high"
    if intent in {"chronology", "actions"}:
        return "medium"
    return "normal"


def _runtime_cards(runtime: dict[str, Any]) -> list[RuntimeUICard]:
    runtime_cards = runtime.get("cards") if isinstance(runtime.get("cards"), list) else []
    intent = _safe_string(runtime.get("intent") or "general")
    cards: list[RuntimeUICard] = []

    for item in runtime_cards:
        if not isinstance(item, dict):
            continue
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        cards.append(
            RuntimeUICard(
                card_type=_safe_string(item.get("key") or "card"),
                title=_safe_string(item.get("title") or "Operational card"),
                priority=_priority(intent),
                summary=_safe_string(payload.get("summary") or payload.get("review_status") or payload.get("draft_status") or payload.get("overall_level") or "Operational insight available."),
                citations=item.get("citations", []) if isinstance(item.get("citations"), list) else [],
                actions=payload.get("recommended_actions", []) if isinstance(payload.get("recommended_actions"), list) else [],
                metadata={
                    "warning_count": len(item.get("warnings", [])) if isinstance(item.get("warnings"), list) else 0,
                    "intent": intent,
                },
            )
        )

    return cards


def _citation_drawer(runtime: dict[str, Any]) -> list[CitationDrawerItem]:
    retrieval = runtime.get("retrieved_evidence") if isinstance(runtime.get("retrieved_evidence"), dict) else {}
    retrieved = retrieval.get("retrieved") if isinstance(retrieval.get("retrieved"), list) else []

    drawer: list[CitationDrawerItem] = []

    for item in retrieved[:40]:
        if not isinstance(item, dict):
            continue
        drawer.append(
            CitationDrawerItem(
                citation_ref=_safe_string(item.get("citation_ref")),
                title=_safe_string(item.get("title") or "Evidence item"),
                record_type=_safe_string(item.get("record_type") or "record"),
                excerpt=_safe_string(item.get("excerpt")),
                chronology_position=_safe_string(item.get("date") or "date not visible"),
                linked_actions=[],
                warnings=[],
            )
        )

    return drawer


def build_runtime_workspace_payload(
    *,
    query: str,
    evidence_index: list[dict[str, Any]] | None,
    role: str = "manager",
    assistant_surface: str = "os_embedded",
    scope_type: str = "home",
) -> RuntimeWorkspacePayload:
    runtime = serialise_operational_runtime(
        run_operational_runtime(
            query=query,
            evidence_index=evidence_index,
            role=role,
            assistant_surface=assistant_surface,
            scope_type=scope_type,
        )
    )

    intent = _safe_string(runtime.get("intent") or "general")

    return RuntimeWorkspacePayload(
        workspace_type=intent,
        runtime=runtime,
        cards=_runtime_cards(runtime),
        citation_drawer=_citation_drawer(runtime),
        workspace_layout={
            "left_sidebar": ["conversations", "homes", "alerts", "workflows"],
            "main_workspace": ["assistant", "chronology", "dashboard"],
            "right_drawer": ["citations", "evidence", "actions"],
        },
        warnings=runtime.get("warnings", []) if isinstance(runtime.get("warnings"), list) else [],
    )


def serialise_runtime_workspace_payload(payload: RuntimeWorkspacePayload) -> dict[str, Any]:
    return {
        "workspace_type": payload.workspace_type,
        "runtime": payload.runtime,
        "cards": [
            {
                "card_type": card.card_type,
                "title": card.title,
                "priority": card.priority,
                "summary": card.summary,
                "citations": card.citations,
                "actions": card.actions,
                "metadata": card.metadata,
            }
            for card in payload.cards
        ],
        "citation_drawer": [
            {
                "citation_ref": item.citation_ref,
                "title": item.title,
                "record_type": item.record_type,
                "excerpt": item.excerpt,
                "chronology_position": item.chronology_position,
                "linked_actions": item.linked_actions,
                "warnings": item.warnings,
            }
            for item in payload.citation_drawer
        ],
        "workspace_layout": payload.workspace_layout,
        "warnings": payload.warnings,
    }
