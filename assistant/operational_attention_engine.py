from __future__ import annotations

"""Operational attention modelling for IndiCare Assistant.

This engine prioritises operational focus areas from visible evidence and
runtime state. It supports ambient operational intelligence and dashboard
prioritisation.
"""

from dataclasses import dataclass, field
from typing import Any


HIGH_ATTENTION_TERMS = {
    "missing",
    "self-harm",
    "police",
    "exploitation",
    "assault",
    "strategy meeting",
    "lado",
    "urgent",
    "overdue",
}


@dataclass(frozen=True)
class AttentionItem:
    title: str
    priority: str
    rationale: str
    citation_ref: str
    recommended_action: str


@dataclass(frozen=True)
class OperationalAttentionResult:
    attention_level: str
    items: list[AttentionItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def build_operational_attention(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 12,
) -> OperationalAttentionResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []

    if not evidence:
        return OperationalAttentionResult(
            attention_level="idle",
            warnings=["no_attention_evidence_available"],
        )

    items: list[AttentionItem] = []

    for item in evidence[:limit]:
        if not isinstance(item, dict):
            continue

        text = " ".join(
            _safe_string(item.get(key)).lower()
            for key in ("title", "excerpt", "summary", "notes")
        )

        if any(term in text for term in HIGH_ATTENTION_TERMS):
            items.append(
                AttentionItem(
                    title=_safe_string(item.get("title") or "Operational attention required"),
                    priority="high",
                    rationale="High-priority safeguarding or operational indicators detected.",
                    citation_ref=_safe_string(item.get("citation_ref")),
                    recommended_action="Review safeguarding status, chronology continuity and management follow-up.",
                )
            )

    level = "high" if items else "normal"

    return OperationalAttentionResult(
        attention_level=level,
        items=items,
        warnings=[],
    )


def serialise_operational_attention(result: OperationalAttentionResult) -> dict[str, Any]:
    return {
        "attention_level": result.attention_level,
        "warnings": result.warnings,
        "items": [
            {
                "title": item.title,
                "priority": item.priority,
                "rationale": item.rationale,
                "citation_ref": item.citation_ref,
                "recommended_action": item.recommended_action,
            }
            for item in result.items
        ],
    }
