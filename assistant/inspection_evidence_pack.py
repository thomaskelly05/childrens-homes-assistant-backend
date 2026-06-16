from __future__ import annotations

"""Inspection evidence pack builder for IndiCare OS assistant.

This module organises visible OS evidence into inspection evidence preparation themes. It does
not predict Ofsted grades or make final compliance judgements. It prepares a
structured evidence bundle that managers, RIs and providers can review.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.chronology_synthesiser import build_chronology_synthesis, serialise_chronology_synthesis
from assistant.inspection_readiness import build_inspection_readiness, serialise_inspection_readiness
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.pattern_detection import detect_patterns, serialise_pattern_detection
from assistant.reg45_builder import build_reg45_review_context, serialise_reg45_review_context
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


EVIDENCE_THEMES: dict[str, set[str]] = {
    "Children's experiences and progress": {
        "daily_note",
        "handover",
        "handover_record",
        "keywork",
        "achievement_record",
        "education_record",
        "family_contact",
        "health_record",
    },
    "Safeguarding and protection": {
        "incident",
        "missing_episode",
        "safeguarding_record",
        "risk",
        "risk_assessment",
    },
    "Care planning and risk management": {
        "support_plan",
        "care_plan",
        "placement_plan",
        "risk",
        "risk_assessment",
        "task",
    },
    "Leadership and management oversight": {
        "manager_action",
        "monthly_review",
        "quality_audit",
        "inspection_action",
        "reg44_visit",
        "reg44_finding",
        "reg45_review",
        "task",
    },
    "Workforce and supervision": {
        "supervision_session",
        "training_record",
        "staff",
        "rota",
        "handover",
        "handover_record",
    },
    "Quality assurance and improvement": {
        "quality_audit",
        "inspection_action",
        "compliance_item",
        "reg44_action",
        "reg45_action",
        "reg45_review",
        "manager_action",
    },
}


@dataclass(frozen=True)
class EvidencePackItem:
    citation_ref: str
    record_type: str
    label: str
    date: str
    excerpt: str


@dataclass(frozen=True)
class EvidencePackTheme:
    theme: str
    evidence_count: int
    items: list[EvidencePackItem] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class InspectionEvidencePack:
    evidence_count: int
    themes: list[EvidencePackTheme] = field(default_factory=list)
    readiness: dict[str, Any] = field(default_factory=dict)
    safeguarding: dict[str, Any] = field(default_factory=dict)
    chronology: dict[str, Any] = field(default_factory=dict)
    patterns: dict[str, Any] = field(default_factory=dict)
    actions: dict[str, Any] = field(default_factory=dict)
    oversight: dict[str, Any] = field(default_factory=dict)
    reg45: dict[str, Any] = field(default_factory=dict)
    suggested_pack_actions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _citation_ref(item: dict[str, Any]) -> str:
    citation = _safe_string(item.get("citation_ref"))
    if citation:
        return citation
    record_type = _safe_string(item.get("record_type") or item.get("type"))
    record_id = _safe_string(item.get("record_id") or item.get("id"))
    if record_type and record_id:
        return f"[{record_type}:{record_id}]"
    return ""


def _record_type(item: dict[str, Any]) -> str:
    return _safe_string(item.get("record_type") or item.get("type") or "record")


def _date_value(item: dict[str, Any]) -> str:
    return _safe_string(item.get("date") or item.get("event_at") or item.get("updated_at") or item.get("created_at"))


def _label(item: dict[str, Any]) -> str:
    return _safe_string(item.get("label") or item.get("title") or _record_type(item) or "Record")


def _excerpt(item: dict[str, Any]) -> str:
    return _safe_string(item.get("excerpt") or item.get("summary") or item.get("description") or item.get("notes") or item.get("outcome"))[:420]


def _item_from_evidence(item: dict[str, Any]) -> EvidencePackItem | None:
    ref = _citation_ref(item)
    if not ref:
        return None
    return EvidencePackItem(
        citation_ref=ref,
        record_type=_record_type(item),
        label=_label(item),
        date=_date_value(item),
        excerpt=_excerpt(item),
    )


def _theme_items(evidence: list[dict[str, Any]], theme: str, limit: int = 12) -> list[EvidencePackItem]:
    types = EVIDENCE_THEMES.get(theme, set())
    items: list[EvidencePackItem] = []
    seen: set[str] = set()
    for raw in evidence:
        if not isinstance(raw, dict):
            continue
        if _record_type(raw) not in types:
            continue
        item = _item_from_evidence(raw)
        if not item:
            continue
        if item.citation_ref.lower() in seen:
            continue
        seen.add(item.citation_ref.lower())
        items.append(item)
    return items[:limit]


def _theme_gap(theme: str, items: list[EvidencePackItem]) -> list[str]:
    if items:
        return []
    return [f"No visible evidence was found for {theme.lower()}."]


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


def build_inspection_evidence_pack(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> InspectionEvidencePack:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return InspectionEvidencePack(
            evidence_count=0,
            themes=[],
            suggested_pack_actions=["Attach or retrieve visible OS evidence before preparing an inspection evidence pack."],
            warnings=["no_visible_evidence_for_inspection_evidence_pack"],
        )

    themes: list[EvidencePackTheme] = []
    for theme in EVIDENCE_THEMES:
        items = _theme_items(evidence, theme)
        themes.append(
            EvidencePackTheme(
                theme=theme,
                evidence_count=len(items),
                items=items,
                gaps=_theme_gap(theme, items),
            )
        )

    readiness = serialise_inspection_readiness(build_inspection_readiness(evidence_index=evidence))
    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    chronology = serialise_chronology_synthesis(build_chronology_synthesis(evidence_index=evidence, limit=30))
    patterns = serialise_pattern_detection(detect_patterns(evidence_index=evidence, min_count=2, limit=10))
    actions = serialise_action_extraction(extract_actions(evidence_index=evidence))
    oversight = serialise_management_oversight(build_management_oversight(evidence_index=evidence))
    reg45 = serialise_reg45_review_context(build_reg45_review_context(evidence_index=evidence))

    suggested: list[str] = []
    suggested.extend(readiness.get("immediate_actions", [])[:6] if isinstance(readiness.get("immediate_actions"), list) else [])
    suggested.extend(oversight.get("recommended_actions", [])[:4] if isinstance(oversight.get("recommended_actions"), list) else [])
    suggested.extend(reg45.get("evidence_gaps", [])[:6] if isinstance(reg45.get("evidence_gaps"), list) else [])

    warnings: list[str] = []
    for payload in (readiness, safeguarding, chronology, patterns, actions, oversight, reg45):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))
    for theme in themes:
        warnings.extend(theme.gaps)

    return InspectionEvidencePack(
        evidence_count=len(evidence),
        themes=themes,
        readiness=readiness,
        safeguarding=safeguarding,
        chronology=chronology,
        patterns=patterns,
        actions=actions,
        oversight=oversight,
        reg45=reg45,
        suggested_pack_actions=_dedupe(suggested)[:15],
        warnings=_dedupe(warnings),
    )


def serialise_inspection_evidence_pack(pack: InspectionEvidencePack) -> dict[str, Any]:
    return {
        "evidence_count": pack.evidence_count,
        "suggested_pack_actions": pack.suggested_pack_actions,
        "warnings": pack.warnings,
        "themes": [
            {
                "theme": theme.theme,
                "evidence_count": theme.evidence_count,
                "gaps": theme.gaps,
                "items": [
                    {
                        "citation_ref": item.citation_ref,
                        "record_type": item.record_type,
                        "label": item.label,
                        "date": item.date,
                        "excerpt": item.excerpt,
                    }
                    for item in theme.items
                ],
            }
            for theme in pack.themes
        ],
        "readiness": pack.readiness,
        "safeguarding": pack.safeguarding,
        "chronology": pack.chronology,
        "patterns": pack.patterns,
        "actions": pack.actions,
        "oversight": pack.oversight,
        "reg45": pack.reg45,
    }


def build_inspection_evidence_pack_prompt_block(pack: InspectionEvidencePack) -> str:
    lines = [
        "INSPECTION EVIDENCE PACK CONTEXT",
        "Use this to organise evidence for inspection, QA, Reg 45 or RI review. Do not predict Ofsted grades.",
        f"Evidence count: {pack.evidence_count}.",
        "",
    ]

    if pack.themes:
        lines.append("Evidence themes:")
        for theme in pack.themes:
            refs = " ".join(item.citation_ref for item in theme.items[:5])
            lines.append(f"- {theme.theme}: {theme.evidence_count} visible item(s). {refs}".strip())

    if pack.suggested_pack_actions:
        lines.append("")
        lines.append("Suggested pack actions:")
        for action in pack.suggested_pack_actions[:12]:
            lines.append(f"- {action}")

    if pack.warnings:
        lines.append("")
        lines.append("Warnings and gaps:")
        for warning in pack.warnings[:15]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
