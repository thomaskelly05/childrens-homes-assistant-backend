from __future__ import annotations

"""Structured safeguarding review engine for IndiCare OS assistant.

This module prepares a conservative safeguarding review framework from visible
OS evidence. It does not decide thresholds, replace safeguarding procedures or
make final professional judgements. It organises evidence for review.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.chronology_drafting import build_chronology_draft, serialise_chronology_draft
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.regulatory_concern_detection import build_regulatory_concern_detection, serialise_regulatory_concern_detection
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


@dataclass(frozen=True)
class SafeguardingReviewSection:
    title: str
    status: str
    summary: str
    evidence_refs: list[str] = field(default_factory=list)
    review_questions: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class StructuredSafeguardingReview:
    review_status: str
    evidence_count: int
    sections: list[SafeguardingReviewSection] = field(default_factory=list)
    immediate_review_actions: list[str] = field(default_factory=list)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


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


def _refs_from_payload(payload: dict[str, Any], sections: tuple[str, ...], limit: int = 6) -> list[str]:
    refs: list[str] = []
    for section in sections:
        value = payload.get(section)
        if not isinstance(value, list):
            continue
        for item in value:
            if not isinstance(item, dict):
                continue
            for key in ("citation_ref", "evidence_ref"):
                ref = _safe_string(item.get(key))
                if ref and ref not in refs:
                    refs.append(ref)
            for key in ("citation_refs", "evidence_refs"):
                maybe = item.get(key)
                if isinstance(maybe, list):
                    for candidate in maybe:
                        ref = _safe_string(candidate)
                        if ref and ref not in refs:
                            refs.append(ref)
            if len(refs) >= limit:
                return refs[:limit]
    return refs[:limit]


def _review_status(safeguarding_level: str, risk_trajectory: str, regulatory_level: str) -> str:
    if safeguarding_level == "urgent" or regulatory_level == "urgent_review_required":
        return "urgent_review_required"
    if safeguarding_level == "heightened" or risk_trajectory == "escalating" or regulatory_level == "high_attention":
        return "high_attention_review"
    if regulatory_level == "review_required":
        return "review_required"
    return "routine_review"


def build_structured_safeguarding_review(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> StructuredSafeguardingReview:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return StructuredSafeguardingReview(
            review_status="unavailable",
            evidence_count=0,
            sections=[],
            immediate_review_actions=["Attach visible OS evidence before producing a safeguarding review."],
            warnings=["no_visible_evidence_for_structured_safeguarding_review"],
        )

    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    risk = serialise_risk_trajectory(build_risk_trajectory(evidence_index=evidence))
    chronology = serialise_chronology_draft(build_chronology_draft(evidence_index=evidence))
    actions = serialise_action_extraction(extract_actions(evidence_index=evidence))
    oversight = serialise_management_oversight(build_management_oversight(evidence_index=evidence))
    regulatory = serialise_regulatory_concern_detection(build_regulatory_concern_detection(evidence_index=evidence))

    status = _review_status(
        _safe_string(safeguarding.get("level")),
        _safe_string(risk.get("trajectory")),
        _safe_string(regulatory.get("overall_level")),
    )

    sections = [
        SafeguardingReviewSection(
            title="Presenting safeguarding concern",
            status=_safe_string(safeguarding.get("level")) or "unknown",
            summary=f"Safeguarding level is {safeguarding.get('level', 'unknown')} based on visible indicators.",
            evidence_refs=_refs_from_payload(safeguarding, ("indicators",)),
            review_questions=[
                "What is the immediate concern and what is directly evidenced?",
                "Is the child currently safe and appropriately supervised?",
                "Who has been informed and when?",
            ],
            actions=list(safeguarding.get("recommended_actions") or [])[:5],
        ),
        SafeguardingReviewSection(
            title="Chronology and sequence",
            status=_safe_string(chronology.get("draft_status")) or "unknown",
            summary=f"Chronology draft contains {len(chronology.get('entries', [])) if isinstance(chronology.get('entries'), list) else 0} visible entrie(s).",
            evidence_refs=_refs_from_payload(chronology, ("entries",)),
            review_questions=[
                "What happened, in what order, and what remains unclear?",
                "Are there missing dates, missing outcomes or weak links between events?",
                "Does the sequence show escalation, stabilisation or repeated patterns?",
            ],
            actions=list(chronology.get("evidence_gaps") or [])[:5],
        ),
        SafeguardingReviewSection(
            title="Risk trajectory and current controls",
            status=_safe_string(risk.get("trajectory")) or "unknown",
            summary=f"Risk trajectory appears {risk.get('trajectory', 'unknown')} with {risk.get('confidence', 'low')} confidence.",
            evidence_refs=_refs_from_payload(risk, ("points",)),
            review_questions=[
                "Are current risk controls proportionate to the latest evidence?",
                "Do care plans and risk assessments reflect the current presentation?",
                "Is there evidence that actions are reducing risk or improving safety?",
            ],
            actions=list(risk.get("recommended_actions") or [])[:5],
        ),
        SafeguardingReviewSection(
            title="Actions and follow-through",
            status="open_actions" if int(actions.get("open_count") or 0) else "limited_or_clear",
            summary=f"Visible actions include {actions.get('open_count', 0)} open action(s), {actions.get('completed_count', 0)} completed action(s) and {actions.get('gap_count', 0)} quality gap(s).",
            evidence_refs=_refs_from_payload(actions, ("actions",)),
            review_questions=[
                "Are actions owned, dated and reviewed?",
                "Is there evidence of completion and impact?",
                "Are any safeguarding actions overdue or unclear?",
            ],
            actions=["Clarify owner, due/review date, status and evidence of impact for any open or unclear actions."],
        ),
        SafeguardingReviewSection(
            title="Management oversight",
            status=_safe_string(oversight.get("oversight_level")) or "unknown",
            summary=f"Management oversight level is {oversight.get('oversight_level', 'unknown')} based on visible evidence.",
            evidence_refs=_refs_from_payload(oversight, ("findings",)),
            review_questions=[
                "Is management oversight visible and timely?",
                "Are decisions, rationale and escalation recorded?",
                "Is there evidence of impact on the child’s safety and care?",
            ],
            actions=list(oversight.get("recommended_actions") or [])[:5],
        ),
        SafeguardingReviewSection(
            title="Regulatory review considerations",
            status=_safe_string(regulatory.get("overall_level")) or "unknown",
            summary=f"Regulatory concern level is {regulatory.get('overall_level', 'unknown')}. This is for professional review only.",
            evidence_refs=_refs_from_payload(regulatory, ("concerns",)),
            review_questions=[
                "Do the visible facts require manager/RI review against relevant regulations?",
                "Is Regulation 40 notification consideration needed?",
                "What professional judgement and rationale should be recorded?",
            ],
            actions=[
                action
                for concern in regulatory.get("concerns", []) if isinstance(concern, dict)
                for action in concern.get("recommended_review_actions", []) if _safe_string(action)
            ][:6],
        ),
    ]

    immediate_actions: list[str] = []
    for section in sections:
        immediate_actions.extend(section.actions)

    warnings: list[str] = []
    for payload in (safeguarding, risk, chronology, actions, oversight, regulatory):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return StructuredSafeguardingReview(
        review_status=status,
        evidence_count=len(evidence),
        sections=sections,
        immediate_review_actions=_dedupe(immediate_actions)[:15],
        source_modules={
            "safeguarding": safeguarding,
            "risk_trajectory": risk,
            "chronology_draft": chronology,
            "actions": actions,
            "management_oversight": oversight,
            "regulatory_concerns": regulatory,
        },
        warnings=sorted(set(warnings)),
    )


def serialise_structured_safeguarding_review(result: StructuredSafeguardingReview) -> dict[str, Any]:
    return {
        "review_status": result.review_status,
        "evidence_count": result.evidence_count,
        "immediate_review_actions": result.immediate_review_actions,
        "warnings": result.warnings,
        "sections": [
            {
                "title": section.title,
                "status": section.status,
                "summary": section.summary,
                "evidence_refs": section.evidence_refs,
                "review_questions": section.review_questions,
                "actions": section.actions,
            }
            for section in result.sections
        ],
        "source_modules": result.source_modules,
    }


def build_structured_safeguarding_review_prompt_block(result: StructuredSafeguardingReview) -> str:
    lines = [
        "STRUCTURED SAFEGUARDING REVIEW CONTEXT",
        "Use this as a safeguarding review framework. Do not replace safeguarding procedures, manager judgement or multi-agency decision-making.",
        f"Review status: {result.review_status}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.sections:
        lines.append("Review sections:")
        for section in result.sections:
            refs = " ".join(section.evidence_refs)
            lines.append(f"- {section.title}: {section.status}. {section.summary} {refs}".strip())
            for question in section.review_questions[:3]:
                lines.append(f"  Question: {question}")

    if result.immediate_review_actions:
        lines.append("")
        lines.append("Immediate review actions:")
        for action in result.immediate_review_actions[:12]:
            lines.append(f"- {action}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
