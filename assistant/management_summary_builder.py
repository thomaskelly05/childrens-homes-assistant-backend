from __future__ import annotations

"""Management summary builder for IndiCare OS assistant.

This module turns dashboard intelligence into a concise management/RI summary
payload. It does not generate free-text with an LLM; it prepares structured,
evidence-aware sections that the assistant can use safely.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.operational_dashboard import build_operational_dashboard, serialise_operational_dashboard


@dataclass(frozen=True)
class ManagementSummarySection:
    title: str
    status: str
    summary: str
    evidence_refs: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ManagementSummary:
    audience: str
    headline: str
    evidence_count: int
    sections: list[ManagementSummarySection] = field(default_factory=list)
    immediate_actions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    dashboard: dict[str, Any] = field(default_factory=dict)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = _safe_string(item)
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def _refs_from_payload(payload: dict[str, Any], limit: int = 5) -> list[str]:
    refs: list[str] = []
    if not isinstance(payload, dict):
        return []

    def collect(value: Any) -> None:
        if len(refs) >= limit:
            return
        if isinstance(value, dict):
            ref = _safe_string(value.get("citation_ref"))
            if ref and ref not in refs:
                refs.append(ref)
            citation_refs = value.get("citation_refs")
            if isinstance(citation_refs, list):
                for candidate in citation_refs:
                    text = _safe_string(candidate)
                    if text and text not in refs:
                        refs.append(text)
                        if len(refs) >= limit:
                            return
            for nested in value.values():
                collect(nested)
        elif isinstance(value, list):
            for item in value:
                collect(item)
                if len(refs) >= limit:
                    return

    collect(payload)
    return refs[:limit]


def _actions_from_payload(payload: dict[str, Any], limit: int = 5) -> list[str]:
    actions: list[str] = []
    if not isinstance(payload, dict):
        return []

    for key in ("recommended_actions", "immediate_actions", "priority_actions", "provider_actions"):
        value = payload.get(key)
        if isinstance(value, list):
            actions.extend(_safe_string(item) for item in value if _safe_string(item))

    recommendations = payload.get("recommendations")
    if isinstance(recommendations, list):
        for item in recommendations:
            if isinstance(item, dict):
                actions.append(_safe_string(item.get("recommendation")))

    return _dedupe(actions)[:limit]


def _section_from_card(card: dict[str, Any]) -> ManagementSummarySection:
    payload = card.get("payload") if isinstance(card.get("payload"), dict) else {}
    return ManagementSummarySection(
        title=_safe_string(card.get("title")) or _safe_string(card.get("key")) or "Summary",
        status=_safe_string(card.get("status")) or "unknown",
        summary=_safe_string(card.get("summary")) or "No summary available.",
        evidence_refs=_refs_from_payload(payload),
        actions=_actions_from_payload(payload),
    )


def _headline_from_dashboard(payload: dict[str, Any]) -> str:
    cards = payload.get("cards") if isinstance(payload.get("cards"), list) else []
    high_priority = [card for card in cards if isinstance(card, dict) and card.get("priority") == "high"]
    medium_priority = [card for card in cards if isinstance(card, dict) and card.get("priority") == "medium"]

    if high_priority:
        return f"{len(high_priority)} high-priority area(s) need management attention."
    if medium_priority:
        return f"{len(medium_priority)} area(s) need monitoring or follow-up."
    return "No high-priority dashboard alerts are visible from the supplied evidence."


def build_management_summary(
    *,
    evidence_index: list[dict[str, Any]] | None,
    audience: str = "manager",
    scope_type: str = "home",
) -> ManagementSummary:
    dashboard = build_operational_dashboard(
        evidence_index=evidence_index,
        scope_type=scope_type,
        user_role=audience,
    )
    payload = serialise_operational_dashboard(dashboard)

    cards = payload.get("cards") if isinstance(payload.get("cards"), list) else []
    sections = [
        _section_from_card(card)
        for card in cards
        if isinstance(card, dict) and card.get("key") in {
            "safeguarding",
            "escalation",
            "what_changed",
            "risk_trajectory",
            "actions",
            "inspection_readiness",
            "recommendations",
            "home_quality",
        }
    ]

    immediate_actions: list[str] = []
    for section in sections:
        immediate_actions.extend(section.actions)

    return ManagementSummary(
        audience=audience,
        headline=_headline_from_dashboard(payload),
        evidence_count=dashboard.evidence_count,
        sections=sections,
        immediate_actions=_dedupe(immediate_actions)[:12],
        warnings=dashboard.warnings,
        dashboard=payload,
    )


def serialise_management_summary(summary: ManagementSummary) -> dict[str, Any]:
    return {
        "audience": summary.audience,
        "headline": summary.headline,
        "evidence_count": summary.evidence_count,
        "immediate_actions": summary.immediate_actions,
        "warnings": summary.warnings,
        "sections": [
            {
                "title": section.title,
                "status": section.status,
                "summary": section.summary,
                "evidence_refs": section.evidence_refs,
                "actions": section.actions,
            }
            for section in summary.sections
        ],
        "dashboard": summary.dashboard,
    }


def build_management_summary_prompt_block(summary: ManagementSummary) -> str:
    lines = [
        "MANAGEMENT SUMMARY CONTEXT",
        "Use this to draft concise management/RI summaries. Do not invent evidence or Ofsted outcomes.",
        f"Audience: {summary.audience}. Evidence count: {summary.evidence_count}.",
        f"Headline: {summary.headline}",
        "",
    ]

    if summary.sections:
        lines.append("Sections:")
        for section in summary.sections:
            refs = " ".join(section.evidence_refs)
            lines.append(f"- {section.title}: {section.status}. {section.summary} {refs}".strip())

    if summary.immediate_actions:
        lines.append("")
        lines.append("Immediate actions:")
        for action in summary.immediate_actions[:10]:
            lines.append(f"- {action}")

    if summary.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in summary.warnings[:10]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
