from __future__ import annotations

"""Regulation 45 quality of care review support builder.

This module prepares structured, evidence-led context for Reg 45 style answers.
It does not write the final report. It organises visible OS evidence into the
minimum professional sections the assistant should address.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.chronology_synthesiser import build_chronology_synthesis, serialise_chronology_synthesis
from assistant.pattern_detection import detect_patterns, serialise_pattern_detection
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation
from assistant.regulatory_context_builder import build_adult_regulatory_context


REG45_REQUIRED_SECTIONS = [
    "Children's experiences and progress",
    "Safeguarding and protection",
    "Quality of care and daily lived experience",
    "Leadership and management oversight",
    "Workforce, consistency and supervision",
    "Strengths and positive impact",
    "Areas for development and evidence gaps",
    "Actions, owners, timescales and review points",
]


@dataclass(frozen=True)
class Reg45ActionPrompt:
    action: str
    owner: str
    timescale: str
    evidence_refs: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Reg45ReviewContext:
    evidence_count: int
    required_sections: list[str]
    regulatory_context: dict[str, Any]
    safeguarding: dict[str, Any]
    chronology: dict[str, Any]
    patterns: dict[str, Any]
    evidence_gaps: list[str]
    action_prompts: list[Reg45ActionPrompt]
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _record_type_counts(evidence_index: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in evidence_index:
        if not isinstance(item, dict):
            continue
        record_type = _safe_string(item.get("record_type") or item.get("type") or "record")
        counts[record_type] = counts.get(record_type, 0) + 1
    return counts


def _citation_ref(item: dict[str, Any]) -> str:
    citation = _safe_string(item.get("citation_ref"))
    if citation:
        return citation
    record_type = _safe_string(item.get("record_type") or item.get("type"))
    record_id = _safe_string(item.get("record_id") or item.get("id"))
    if record_type and record_id:
        return f"[{record_type}:{record_id}]"
    return ""


def _build_evidence_gaps(evidence_index: list[dict[str, Any]]) -> list[str]:
    counts = _record_type_counts(evidence_index)
    gaps: list[str] = []

    def has_any(types: set[str]) -> bool:
        return any(counts.get(item, 0) > 0 for item in types)

    if not has_any({"daily_note", "handover", "handover_record"}):
        gaps.append("No visible daily life or handover evidence was found for the review period.")
    if not has_any({"incident", "missing_episode", "safeguarding_record", "risk", "risk_assessment"}):
        gaps.append("No visible safeguarding, incident or risk evidence was found for the review period.")
    if not has_any({"education_record"}):
        gaps.append("No visible education evidence was found for the review period.")
    if not has_any({"health_record", "appointment"}):
        gaps.append("No visible health or appointment evidence was found for the review period.")
    if not has_any({"family_contact"}):
        gaps.append("No visible family/contact evidence was found for the review period.")
    if not has_any({"manager_action", "task", "quality_audit", "inspection_action", "reg45_action"}):
        gaps.append("No visible management action or quality improvement evidence was found for the review period.")
    if not has_any({"supervision_session", "training_record", "staff", "rota"}):
        gaps.append("No visible workforce, supervision or staffing evidence was found for the review period.")

    return gaps


def _build_action_prompts(
    *,
    evidence_gaps: list[str],
    safeguarding_level: str,
    pattern_payload: dict[str, Any],
) -> list[Reg45ActionPrompt]:
    prompts: list[Reg45ActionPrompt] = []

    if safeguarding_level in {"heightened", "urgent"}:
        prompts.append(
            Reg45ActionPrompt(
                action="Review safeguarding grip, escalation records and evidence of management oversight.",
                owner="Registered Manager / Responsible Individual",
                timescale="Immediate review and evidence update",
                evidence_refs=[],
            )
        )

    for gap in evidence_gaps[:6]:
        prompts.append(
            Reg45ActionPrompt(
                action=f"Strengthen evidence: {gap}",
                owner="Registered Manager",
                timescale="Before finalising the Reg 45 review",
                evidence_refs=[],
            )
        )

    for finding in pattern_payload.get("findings", [])[:5]:
        if not isinstance(finding, dict):
            continue
        theme = _safe_string(finding.get("theme")).replace("_", " ")
        significance = _safe_string(finding.get("significance"))
        refs = finding.get("citation_refs") if isinstance(finding.get("citation_refs"), list) else []
        prompts.append(
            Reg45ActionPrompt(
                action=f"Review {significance or 'emerging'} pattern: {theme}.",
                owner="Registered Manager / Quality Lead",
                timescale="Add to improvement plan with review date",
                evidence_refs=[_safe_string(ref) for ref in refs if _safe_string(ref)],
            )
        )

    # Dedupe by action text.
    result: list[Reg45ActionPrompt] = []
    seen: set[str] = set()
    for prompt in prompts:
        key = prompt.action.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(prompt)
    return result


def build_reg45_review_context(
    *,
    evidence_index: list[dict[str, Any]] | None,
    user_role_profile: str = "manager",
) -> Reg45ReviewContext:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    warnings: list[str] = []

    if not evidence:
        warnings.append("no_visible_evidence_for_reg45_review")

    regulatory_context = build_adult_regulatory_context(
        message="Reg 45 quality of care review for a children’s home",
        mode="quality_review",
        task_type="report",
        output_type="reg45_report",
        safeguarding_level="normal",
        urgency="routine",
        user_role_profile=user_role_profile,
    )

    safeguarding = build_safeguarding_escalation(evidence_index=evidence)
    chronology = build_chronology_synthesis(evidence_index=evidence, limit=20)
    # Reg 45 drafting should surface sparse but material themes for review; this
    # remains a prompt for professional judgement, not a final pattern finding.
    patterns = detect_patterns(evidence_index=evidence, min_count=1, limit=10)

    safeguarding_payload = serialise_safeguarding_escalation(safeguarding)
    chronology_payload = serialise_chronology_synthesis(chronology)
    pattern_payload = serialise_pattern_detection(patterns)

    evidence_gaps = _build_evidence_gaps(evidence)
    if evidence_gaps:
        warnings.append("reg45_evidence_gaps_present")

    action_prompts = _build_action_prompts(
        evidence_gaps=evidence_gaps,
        safeguarding_level=safeguarding.level,
        pattern_payload=pattern_payload,
    )

    return Reg45ReviewContext(
        evidence_count=len(evidence),
        required_sections=REG45_REQUIRED_SECTIONS,
        regulatory_context=regulatory_context,
        safeguarding=safeguarding_payload,
        chronology=chronology_payload,
        patterns=pattern_payload,
        evidence_gaps=evidence_gaps,
        action_prompts=action_prompts,
        warnings=warnings,
    )


def serialise_reg45_review_context(context: Reg45ReviewContext) -> dict[str, Any]:
    return {
        "evidence_count": context.evidence_count,
        "required_sections": context.required_sections,
        "regulatory_context": context.regulatory_context,
        "safeguarding": context.safeguarding,
        "chronology": context.chronology,
        "patterns": context.patterns,
        "evidence_gaps": context.evidence_gaps,
        "action_prompts": [
            {
                "action": item.action,
                "owner": item.owner,
                "timescale": item.timescale,
                "evidence_refs": item.evidence_refs,
            }
            for item in context.action_prompts
        ],
        "warnings": context.warnings,
    }


def build_reg45_prompt_block(context: Reg45ReviewContext) -> str:
    lines = [
        "REG 45 REVIEW CONTEXT",
        "Use this to support, not replace, the registered person’s review of quality of care.",
        "Structure the answer around children’s experiences, safeguarding, leadership, evidence, impact and actions.",
        "Do not invent evidence. Cite visible OS refs for factual claims.",
        "",
        "Required sections:",
    ]

    for section in context.required_sections:
        lines.append(f"- {section}")

    if context.regulatory_context.get("prompt_block"):
        lines.extend(["", context.regulatory_context["prompt_block"]])

    if context.safeguarding.get("level") and context.safeguarding.get("level") != "normal":
        lines.extend(["", f"Safeguarding level: {context.safeguarding.get('level')}"])

    if context.patterns.get("findings"):
        lines.append("")
        lines.append("Key detected patterns:")
        for finding in context.patterns.get("findings", [])[:6]:
            refs = " ".join(finding.get("citation_refs", [])[:4])
            lines.append(f"- {finding.get('theme')}: {finding.get('significance')} ({finding.get('count')}) {refs}".strip())

    if context.evidence_gaps:
        lines.append("")
        lines.append("Evidence gaps to address:")
        for gap in context.evidence_gaps[:8]:
            lines.append(f"- {gap}")

    if context.action_prompts:
        lines.append("")
        lines.append("Action prompts:")
        for action in context.action_prompts[:8]:
            refs = " ".join(action.evidence_refs[:4])
            lines.append(f"- {action.action} Owner: {action.owner}. Timescale: {action.timescale}. {refs}".strip())

    if context.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in context.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
