from __future__ import annotations

"""Inspection evidence preparation scoring for IndiCare OS assistant.

This module converts visible OS evidence into a conservative inspection evidence preparation
view. It does not predict Ofsted grades. It highlights evidence strength,
visible gaps and immediate management actions for professional review.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.pattern_detection import detect_patterns, serialise_pattern_detection
from assistant.reg45_builder import build_reg45_review_context, serialise_reg45_review_context
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


READINESS_DOMAINS = [
    "Safeguarding and protection",
    "Children's experiences and progress",
    "Leadership and management oversight",
    "Workforce, supervision and consistency",
    "Care planning and risk management",
    "Quality assurance and improvement actions",
]

DOMAIN_RECORD_TYPES: dict[str, set[str]] = {
    "Safeguarding and protection": {
        "incident",
        "missing_episode",
        "safeguarding_record",
        "risk",
        "risk_assessment",
    },
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
    "Leadership and management oversight": {
        "manager_action",
        "monthly_review",
        "quality_audit",
        "inspection_action",
        "reg44_finding",
        "reg45_review",
        "task",
    },
    "Workforce, supervision and consistency": {
        "supervision_session",
        "training_record",
        "staff",
        "rota",
        "handover",
        "handover_record",
    },
    "Care planning and risk management": {
        "support_plan",
        "care_plan",
        "placement_plan",
        "risk",
        "risk_assessment",
        "task",
    },
    "Quality assurance and improvement actions": {
        "quality_audit",
        "inspection_action",
        "compliance_item",
        "reg44_visit",
        "reg44_finding",
        "reg44_action",
        "reg45_review",
        "reg45_action",
        "manager_action",
    },
}


@dataclass(frozen=True)
class InspectionDomainScore:
    domain: str
    score: int
    level: str
    evidence_refs: list[str] = field(default_factory=list)
    rationale: str = ""
    actions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class InspectionReadinessResult:
    overall_score: int
    overall_level: str
    domain_scores: list[InspectionDomainScore]
    strengths: list[str]
    vulnerabilities: list[str]
    immediate_actions: list[str]
    evidence_count: int
    warnings: list[str] = field(default_factory=list)
    safeguarding: dict[str, Any] = field(default_factory=dict)
    patterns: dict[str, Any] = field(default_factory=dict)
    reg45: dict[str, Any] = field(default_factory=dict)


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


def _domain_evidence(evidence: list[dict[str, Any]], domain: str) -> list[dict[str, Any]]:
    allowed = DOMAIN_RECORD_TYPES.get(domain, set())
    return [item for item in evidence if isinstance(item, dict) and _record_type(item) in allowed]


def _score_domain(
    *,
    domain: str,
    domain_items: list[dict[str, Any]],
    safeguarding_level: str,
    reg45_gap_count: int,
) -> InspectionDomainScore:
    refs: list[str] = []
    for item in domain_items:
        ref = _citation_ref(item)
        if ref and ref not in refs:
            refs.append(ref)

    count = len(domain_items)
    score = 0
    rationale_parts: list[str] = []
    actions: list[str] = []

    if count >= 8:
        score = 80
        rationale_parts.append("Strong visible evidence volume for this domain.")
    elif count >= 4:
        score = 65
        rationale_parts.append("Moderate visible evidence for this domain.")
    elif count >= 1:
        score = 45
        rationale_parts.append("Limited visible evidence for this domain.")
    else:
        score = 20
        rationale_parts.append("No visible evidence for this domain.")
        actions.append(f"Add or review evidence for {domain.lower()}.")

    if domain == "Safeguarding and protection" and safeguarding_level in {"heightened", "urgent"}:
        score = min(score, 55 if safeguarding_level == "heightened" else 40)
        rationale_parts.append(f"Safeguarding escalation level is {safeguarding_level}; management review is required.")
        actions.append("Review safeguarding grip, escalation records and evidence of follow-through.")

    if domain in {"Leadership and management oversight", "Quality assurance and improvement actions"} and reg45_gap_count >= 3:
        score = min(score, 50)
        rationale_parts.append("Multiple Reg 45 evidence gaps are visible.")
        actions.append("Strengthen management oversight evidence and improvement action tracking.")

    if score >= 75:
        level = "strong"
    elif score >= 55:
        level = "developing"
    elif score >= 35:
        level = "limited"
    else:
        level = "weak"

    return InspectionDomainScore(
        domain=domain,
        score=score,
        level=level,
        evidence_refs=refs[:8],
        rationale=" ".join(rationale_parts),
        actions=actions,
    )


def _overall_level(score: int) -> str:
    if score >= 75:
        return "strong"
    if score >= 55:
        return "developing"
    if score >= 35:
        return "limited"
    return "weak"


def build_inspection_readiness(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> InspectionReadinessResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    warnings: list[str] = []

    if not evidence:
        warnings.append("no_visible_evidence_for_inspection_readiness")

    safeguarding = build_safeguarding_escalation(evidence_index=evidence)
    patterns = detect_patterns(evidence_index=evidence, min_count=2, limit=8)
    reg45_context = build_reg45_review_context(evidence_index=evidence)

    safeguarding_payload = serialise_safeguarding_escalation(safeguarding)
    pattern_payload = serialise_pattern_detection(patterns)
    reg45_payload = serialise_reg45_review_context(reg45_context)

    reg45_gap_count = len(reg45_payload.get("evidence_gaps", []))

    domain_scores = [
        _score_domain(
            domain=domain,
            domain_items=_domain_evidence(evidence, domain),
            safeguarding_level=safeguarding.level,
            reg45_gap_count=reg45_gap_count,
        )
        for domain in READINESS_DOMAINS
    ]

    overall_score = int(sum(item.score for item in domain_scores) / len(domain_scores)) if domain_scores else 0
    level = _overall_level(overall_score)

    strengths = [
        f"{item.domain}: {item.rationale} {' '.join(item.evidence_refs[:3])}".strip()
        for item in domain_scores
        if item.level in {"strong", "developing"}
    ][:6]

    vulnerabilities = [
        f"{item.domain}: {item.rationale}"
        for item in domain_scores
        if item.level in {"limited", "weak"}
    ][:8]

    immediate_actions: list[str] = []
    for item in domain_scores:
        immediate_actions.extend(item.actions)

    for action in safeguarding_payload.get("recommended_actions", [])[:5]:
        if isinstance(action, str):
            immediate_actions.append(action)

    for gap in reg45_payload.get("evidence_gaps", [])[:5]:
        immediate_actions.append(f"Address evidence gap: {gap}")

    # Dedupe actions.
    deduped_actions: list[str] = []
    seen_actions: set[str] = set()
    for action in immediate_actions:
        key = action.lower()
        if key in seen_actions:
            continue
        seen_actions.add(key)
        deduped_actions.append(action)

    if safeguarding.level in {"heightened", "urgent"}:
        warnings.append("inspection_readiness_has_safeguarding_escalation")
    if reg45_gap_count:
        warnings.append("inspection_readiness_has_reg45_evidence_gaps")

    return InspectionReadinessResult(
        overall_score=overall_score,
        overall_level=level,
        domain_scores=domain_scores,
        strengths=strengths,
        vulnerabilities=vulnerabilities,
        immediate_actions=deduped_actions[:12],
        evidence_count=len(evidence),
        warnings=warnings,
        safeguarding=safeguarding_payload,
        patterns=pattern_payload,
        reg45=reg45_payload,
    )


def serialise_inspection_readiness(result: InspectionReadinessResult) -> dict[str, Any]:
    return {
        "overall_score": result.overall_score,
        "overall_level": result.overall_level,
        "evidence_count": result.evidence_count,
        "warnings": result.warnings,
        "strengths": result.strengths,
        "vulnerabilities": result.vulnerabilities,
        "immediate_actions": result.immediate_actions,
        "domain_scores": [
            {
                "domain": item.domain,
                "score": item.score,
                "level": item.level,
                "evidence_refs": item.evidence_refs,
                "rationale": item.rationale,
                "actions": item.actions,
            }
            for item in result.domain_scores
        ],
        "safeguarding": result.safeguarding,
        "patterns": result.patterns,
        "reg45": result.reg45,
    }


def build_inspection_readiness_prompt_block(result: InspectionReadinessResult) -> str:
    lines = [
        "Inspection evidence preparation CONTEXT",
        "Do not predict or imply an Ofsted grade. Use this as evidence-readiness support only.",
        f"Overall readiness: {result.overall_level} ({result.overall_score}/100)",
        "",
        "Domain scores:",
    ]

    for domain in result.domain_scores:
        refs = " ".join(domain.evidence_refs[:4])
        lines.append(f"- {domain.domain}: {domain.level} ({domain.score}/100). {domain.rationale} {refs}".strip())

    if result.vulnerabilities:
        lines.append("")
        lines.append("Visible vulnerabilities:")
        for item in result.vulnerabilities[:8]:
            lines.append(f"- {item}")

    if result.immediate_actions:
        lines.append("")
        lines.append("Immediate actions:")
        for item in result.immediate_actions[:10]:
            lines.append(f"- {item}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
