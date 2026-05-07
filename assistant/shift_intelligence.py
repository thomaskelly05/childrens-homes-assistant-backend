from __future__ import annotations

"""Shift intelligence for IndiCare OS assistant.

This module prepares concise, evidence-led shift handover intelligence from
visible OS evidence. It is designed for RSWs, seniors and managers and should
not invent events, risks or actions.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.chronology_synthesiser import build_chronology_synthesis, serialise_chronology_synthesis
from assistant.escalation_monitoring import build_escalation_monitoring, serialise_escalation_monitoring
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation
from assistant.what_changed import build_what_changed, serialise_what_changed


@dataclass(frozen=True)
class ShiftBriefItem:
    title: str
    detail: str
    priority: str
    evidence_refs: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ShiftIntelligenceResult:
    shift_status: str
    evidence_count: int
    key_updates: list[ShiftBriefItem] = field(default_factory=list)
    safeguarding_alerts: list[ShiftBriefItem] = field(default_factory=list)
    open_actions: list[ShiftBriefItem] = field(default_factory=list)
    positives: list[ShiftBriefItem] = field(default_factory=list)
    manager_follow_up: list[ShiftBriefItem] = field(default_factory=list)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe_items(items: list[ShiftBriefItem]) -> list[ShiftBriefItem]:
    result: list[ShiftBriefItem] = []
    seen: set[str] = set()
    for item in items:
        key = f"{item.title}|{item.detail}|{item.priority}".lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _refs_from_payload(payload: dict[str, Any], *, sections: tuple[str, ...], limit: int = 4) -> list[str]:
    refs: list[str] = []
    if not isinstance(payload, dict):
        return refs

    for section in sections:
        value = payload.get(section)
        if not isinstance(value, list):
            continue
        for item in value:
            if not isinstance(item, dict):
                continue
            ref = _safe_string(item.get("citation_ref"))
            if ref and ref not in refs:
                refs.append(ref)
            citation_refs = item.get("citation_refs")
            if isinstance(citation_refs, list):
                for candidate in citation_refs:
                    candidate_ref = _safe_string(candidate)
                    if candidate_ref and candidate_ref not in refs:
                        refs.append(candidate_ref)
            if len(refs) >= limit:
                return refs[:limit]
    return refs[:limit]


def _shift_status(safeguarding_level: str, escalation_level: str, open_actions: int) -> str:
    if safeguarding_level == "urgent" or escalation_level == "urgent_review_required":
        return "urgent_review_required"
    if safeguarding_level == "heightened" or escalation_level == "high_attention" or open_actions >= 3:
        return "high_attention"
    if open_actions:
        return "monitoring_required"
    return "routine"


def build_shift_intelligence(
    *,
    evidence_index: list[dict[str, Any]] | None,
    period_days: int = 2,
) -> ShiftIntelligenceResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return ShiftIntelligenceResult(
            shift_status="unknown",
            evidence_count=0,
            warnings=["no_visible_evidence_for_shift_intelligence"],
            key_updates=[
                ShiftBriefItem(
                    title="Evidence required",
                    detail="No visible OS evidence is attached, so a reliable shift briefing cannot be generated.",
                    priority="high",
                    evidence_refs=[],
                )
            ],
        )

    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    escalation = serialise_escalation_monitoring(build_escalation_monitoring(evidence_index=evidence))
    what_changed = serialise_what_changed(build_what_changed(evidence_index=evidence, period_days=period_days))
    actions = serialise_action_extraction(extract_actions(evidence_index=evidence))
    chronology = serialise_chronology_synthesis(build_chronology_synthesis(evidence_index=evidence, limit=12))

    status = _shift_status(
        _safe_string(safeguarding.get("level")),
        _safe_string(escalation.get("monitoring_level")),
        int(actions.get("open_count") or 0),
    )

    key_updates: list[ShiftBriefItem] = []
    for headline in what_changed.get("headlines", [])[:4]:
        key_updates.append(
            ShiftBriefItem(
                title="Recent change",
                detail=_safe_string(headline),
                priority="medium",
                evidence_refs=_refs_from_payload(what_changed, sections=("signals",)),
            )
        )

    for event in chronology.get("events", [])[:4]:
        if not isinstance(event, dict):
            continue
        key_updates.append(
            ShiftBriefItem(
                title=_safe_string(event.get("label")) or "Chronology update",
                detail=_safe_string(event.get("excerpt")) or "Chronology event visible.",
                priority="normal",
                evidence_refs=[_safe_string(event.get("citation_ref"))] if _safe_string(event.get("citation_ref")) else [],
            )
        )

    safeguarding_alerts: list[ShiftBriefItem] = []
    for alert in escalation.get("alerts", [])[:6]:
        if not isinstance(alert, dict):
            continue
        safeguarding_alerts.append(
            ShiftBriefItem(
                title=_safe_string(alert.get("title")) or "Safeguarding alert",
                detail=_safe_string(alert.get("reason")) or _safe_string(alert.get("recommended_action")),
                priority="high" if _safe_string(alert.get("severity")) in {"urgent", "high"} else "medium",
                evidence_refs=[_safe_string(ref) for ref in alert.get("evidence_refs", []) if _safe_string(ref)] if isinstance(alert.get("evidence_refs"), list) else [],
            )
        )

    open_actions: list[ShiftBriefItem] = []
    for action in actions.get("actions", [])[:8]:
        if not isinstance(action, dict) or action.get("status") != "open":
            continue
        owner = _safe_string(action.get("owner")) or "owner not visible"
        due = _safe_string(action.get("due_date")) or "due/review date not visible"
        open_actions.append(
            ShiftBriefItem(
                title=_safe_string(action.get("label")) or "Open action",
                detail=f"{_safe_string(action.get('action'))} Owner: {owner}. Due/review: {due}.",
                priority="high" if action.get("gaps") else "medium",
                evidence_refs=[_safe_string(action.get("citation_ref"))] if _safe_string(action.get("citation_ref")) else [],
            )
        )

    positives: list[ShiftBriefItem] = []
    for signal in what_changed.get("signals", [])[:8]:
        if not isinstance(signal, dict) or signal.get("direction") != "improving_or_strength":
            continue
        positives.append(
            ShiftBriefItem(
                title="Positive progress",
                detail=_safe_string(signal.get("excerpt")) or "Positive progress signal visible.",
                priority="normal",
                evidence_refs=[_safe_string(signal.get("citation_ref"))] if _safe_string(signal.get("citation_ref")) else [],
            )
        )

    manager_follow_up: list[ShiftBriefItem] = []
    if status in {"urgent_review_required", "high_attention"}:
        manager_follow_up.append(
            ShiftBriefItem(
                title="Manager review required",
                detail="Review safeguarding grip, current risk controls, open actions and whether external escalation is required.",
                priority="high",
                evidence_refs=_refs_from_payload(escalation, sections=("alerts",)),
            )
        )
    if actions.get("gap_count", 0):
        manager_follow_up.append(
            ShiftBriefItem(
                title="Action quality gaps",
                detail="Some actions have missing owner, due/review date or unclear status. Clarify before relying on the handover.",
                priority="medium",
                evidence_refs=_refs_from_payload(actions, sections=("actions",)),
            )
        )

    warnings: list[str] = []
    for payload in (safeguarding, escalation, what_changed, actions, chronology):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return ShiftIntelligenceResult(
        shift_status=status,
        evidence_count=len(evidence),
        key_updates=_dedupe_items(key_updates)[:8],
        safeguarding_alerts=_dedupe_items(safeguarding_alerts)[:8],
        open_actions=_dedupe_items(open_actions)[:8],
        positives=_dedupe_items(positives)[:6],
        manager_follow_up=_dedupe_items(manager_follow_up)[:6],
        source_modules={
            "safeguarding": safeguarding,
            "escalation": escalation,
            "what_changed": what_changed,
            "actions": actions,
            "chronology": chronology,
        },
        warnings=sorted(set(warnings)),
    )


def serialise_shift_intelligence(result: ShiftIntelligenceResult) -> dict[str, Any]:
    def item_payload(item: ShiftBriefItem) -> dict[str, Any]:
        return {
            "title": item.title,
            "detail": item.detail,
            "priority": item.priority,
            "evidence_refs": item.evidence_refs,
        }

    return {
        "shift_status": result.shift_status,
        "evidence_count": result.evidence_count,
        "warnings": result.warnings,
        "key_updates": [item_payload(item) for item in result.key_updates],
        "safeguarding_alerts": [item_payload(item) for item in result.safeguarding_alerts],
        "open_actions": [item_payload(item) for item in result.open_actions],
        "positives": [item_payload(item) for item in result.positives],
        "manager_follow_up": [item_payload(item) for item in result.manager_follow_up],
        "source_modules": result.source_modules,
    }


def build_shift_intelligence_prompt_block(result: ShiftIntelligenceResult) -> str:
    lines = [
        "SHIFT INTELLIGENCE CONTEXT",
        "Use this for shift handover support. Do not invent events, risks or actions.",
        f"Shift status: {result.shift_status}. Evidence count: {result.evidence_count}.",
        "",
    ]

    sections = [
        ("Key updates", result.key_updates),
        ("Safeguarding alerts", result.safeguarding_alerts),
        ("Open actions", result.open_actions),
        ("Positive progress", result.positives),
        ("Manager follow-up", result.manager_follow_up),
    ]

    for title, items in sections:
        if not items:
            continue
        lines.append(title + ":")
        for item in items:
            refs = " ".join(item.evidence_refs)
            lines.append(f"- {item.priority.upper()} {item.title}: {item.detail} {refs}".strip())
        lines.append("")

    if result.warnings:
        lines.append("Warnings:")
        for warning in result.warnings[:10]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
