from __future__ import annotations

"""Quality scoring framework for IndiCare OS assistant.

This module produces conservative internal quality scores from visible OS
evidence. It does not predict Ofsted grades. Scores are prompts for management,
RI/provider and QA review, not final compliance decisions.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.home_quality_trends import build_home_quality_trend, serialise_home_quality_trend
from assistant.inspection_readiness import build_inspection_readiness, serialise_inspection_readiness
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


QUALITY_DOMAINS = [
    "safeguarding",
    "care_experience",
    "leadership_oversight",
    "actions_follow_through",
    "inspection_evidence",
]


@dataclass(frozen=True)
class QualityDomainScore:
    domain: str
    score: int
    level: str
    rationale: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class QualityScoreResult:
    overall_score: int
    overall_level: str
    evidence_count: int
    domain_scores: list[QualityDomainScore] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    concerns: list[str] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _level(score: int) -> str:
    if score >= 80:
        return "strong"
    if score >= 65:
        return "developing_strength"
    if score >= 45:
        return "requires_attention"
    return "high_attention"


def _dedupe(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = str(item or "").strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def _score_safeguarding(safeguarding: dict[str, Any], risk: dict[str, Any]) -> QualityDomainScore:
    score = 75
    rationale: list[str] = []
    actions: list[str] = []

    level = safeguarding.get("level")
    trajectory = risk.get("trajectory")

    if level == "urgent":
        score = 35
        rationale.append("Urgent safeguarding indicators are visible.")
        actions.append("Review immediate safety, escalation and safeguarding follow-through now.")
    elif level == "heightened":
        score = 50
        rationale.append("Heightened safeguarding indicators are visible.")
        actions.append("Review safeguarding grip, supervision and multi-agency communication.")
    else:
        rationale.append("No urgent safeguarding level was detected from visible evidence.")

    if trajectory == "escalating":
        score = min(score, 45)
        rationale.append("Risk trajectory appears escalating.")
        actions.append("Review current risk controls and care planning impact.")
    elif trajectory == "reducing_or_better_controlled":
        score = min(90, score + 10)
        rationale.append("Risk trajectory appears reducing or better controlled.")

    return QualityDomainScore(
        domain="safeguarding",
        score=score,
        level=_level(score),
        rationale=rationale,
        actions=actions,
    )


def _score_care_experience(home_quality: dict[str, Any]) -> QualityDomainScore:
    score = 60
    rationale: list[str] = []
    actions: list[str] = []

    strengths = home_quality.get("strengths") if isinstance(home_quality.get("strengths"), list) else []
    vulnerabilities = home_quality.get("vulnerabilities") if isinstance(home_quality.get("vulnerabilities"), list) else []

    if strengths:
        score += min(20, len(strengths) * 5)
        rationale.append(f"{len(strengths)} visible strength(s) are present.")
    if vulnerabilities:
        score -= min(30, len(vulnerabilities) * 5)
        rationale.append(f"{len(vulnerabilities)} visible vulnerability item(s) are present.")
        actions.append("Review whether vulnerabilities affect children's lived experience and progress.")
    if not strengths and not vulnerabilities:
        rationale.append("Limited child experience trend evidence is visible.")
        actions.append("Strengthen evidence of children’s lived experience and impact of care.")

    score = max(20, min(95, score))
    return QualityDomainScore(
        domain="care_experience",
        score=score,
        level=_level(score),
        rationale=rationale,
        actions=actions,
    )


def _score_leadership(oversight: dict[str, Any]) -> QualityDomainScore:
    level = oversight.get("oversight_level")
    score = 60
    rationale: list[str] = []
    actions: list[str] = []

    if level == "visible_grip":
        score = 82
        rationale.append("Visible management grip is present.")
    elif level == "developing_with_gaps":
        score = 58
        rationale.append("Management oversight is visible but gaps remain.")
        actions.append("Strengthen ownership, timescales, sign-off and impact evidence.")
    elif level in {"weak_or_unclear", "limited_visible_oversight"}:
        score = 40
        rationale.append("Management oversight appears weak or limited from visible evidence.")
        actions.append("Review oversight records for decision-making, rationale and follow-through.")
    else:
        score = 45
        rationale.append("Management oversight evidence is unclear or limited.")
        actions.append("Add visible management oversight evidence.")

    return QualityDomainScore(
        domain="leadership_oversight",
        score=score,
        level=_level(score),
        rationale=rationale,
        actions=actions,
    )


def _score_actions(actions_payload: dict[str, Any]) -> QualityDomainScore:
    open_count = int(actions_payload.get("open_count") or 0)
    gap_count = int(actions_payload.get("gap_count") or 0)
    completed_count = int(actions_payload.get("completed_count") or 0)

    score = 75
    rationale = [f"Open actions: {open_count}; completed actions: {completed_count}; quality gaps: {gap_count}."]
    actions: list[str] = []

    if open_count >= 5 or gap_count >= 5:
        score = 35
        actions.append("Review open actions urgently for owner, timescale, completion evidence and child impact.")
    elif open_count >= 2 or gap_count >= 2:
        score = 55
        actions.append("Tighten action tracking and review dates.")
    elif completed_count >= 2 and open_count == 0 and gap_count == 0:
        score = 85
        rationale.append("Completed actions are visible with no detected action quality gaps.")

    return QualityDomainScore(
        domain="actions_follow_through",
        score=score,
        level=_level(score),
        rationale=rationale,
        actions=actions,
    )


def _score_inspection(readiness: dict[str, Any]) -> QualityDomainScore:
    score = int(readiness.get("overall_score") or 0)
    if not score:
        score = 40
    rationale = [f"Inspection evidence preparation level is {readiness.get('overall_level', 'unknown')} ({score}/100)."]
    actions = readiness.get("immediate_actions") if isinstance(readiness.get("immediate_actions"), list) else []

    return QualityDomainScore(
        domain="inspection_evidence",
        score=score,
        level=_level(score),
        rationale=rationale,
        actions=[str(item) for item in actions[:5]],
    )


def build_quality_score(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> QualityScoreResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        empty = QualityDomainScore(
            domain="evidence",
            score=0,
            level="unknown",
            rationale=["No visible scoped evidence was supplied."],
            actions=["Attach visible OS evidence before scoring quality."],
        )
        return QualityScoreResult(
            overall_score=0,
            overall_level="unknown",
            evidence_count=0,
            domain_scores=[empty],
            recommended_actions=empty.actions,
            warnings=["no_visible_evidence_for_quality_scoring"],
        )

    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    risk = serialise_risk_trajectory(build_risk_trajectory(evidence_index=evidence))
    oversight = serialise_management_oversight(build_management_oversight(evidence_index=evidence))
    actions_payload = serialise_action_extraction(extract_actions(evidence_index=evidence))
    readiness = serialise_inspection_readiness(build_inspection_readiness(evidence_index=evidence))
    home_quality = serialise_home_quality_trend(build_home_quality_trend(evidence_index=evidence))

    domain_scores = [
        _score_safeguarding(safeguarding, risk),
        _score_care_experience(home_quality),
        _score_leadership(oversight),
        _score_actions(actions_payload),
        _score_inspection(readiness),
    ]

    overall = int(sum(item.score for item in domain_scores) / len(domain_scores))
    recommended_actions: list[str] = []
    strengths: list[str] = []
    concerns: list[str] = []

    for item in domain_scores:
        recommended_actions.extend(item.actions)
        if item.level in {"strong", "developing_strength"}:
            strengths.append(f"{item.domain}: {item.level} ({item.score}/100).")
        else:
            concerns.append(f"{item.domain}: {item.level} ({item.score}/100).")

    warnings: list[str] = []
    for payload in (safeguarding, risk, oversight, actions_payload, readiness, home_quality):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(str(item) for item in maybe)

    return QualityScoreResult(
        overall_score=overall,
        overall_level=_level(overall),
        evidence_count=len(evidence),
        domain_scores=domain_scores,
        strengths=_dedupe(strengths),
        concerns=_dedupe(concerns),
        recommended_actions=_dedupe(recommended_actions)[:12],
        source_modules={
            "safeguarding": safeguarding,
            "risk_trajectory": risk,
            "management_oversight": oversight,
            "actions": actions_payload,
            "inspection_readiness": readiness,
            "home_quality": home_quality,
        },
        warnings=_dedupe(warnings),
    )


def serialise_quality_score(result: QualityScoreResult) -> dict[str, Any]:
    return {
        "overall_score": result.overall_score,
        "overall_level": result.overall_level,
        "evidence_count": result.evidence_count,
        "strengths": result.strengths,
        "concerns": result.concerns,
        "recommended_actions": result.recommended_actions,
        "warnings": result.warnings,
        "domain_scores": [
            {
                "domain": item.domain,
                "score": item.score,
                "level": item.level,
                "rationale": item.rationale,
                "actions": item.actions,
            }
            for item in result.domain_scores
        ],
        "source_modules": result.source_modules,
    }


def build_quality_score_prompt_block(result: QualityScoreResult) -> str:
    lines = [
        "QUALITY SCORING CONTEXT",
        "Use this as internal quality intelligence only. Do not present it as an Ofsted grade or final compliance judgement.",
        f"Overall quality score: {result.overall_score}/100 ({result.overall_level}). Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.domain_scores:
        lines.append("Domain scores:")
        for item in result.domain_scores:
            lines.append(f"- {item.domain}: {item.score}/100 ({item.level}). {' '.join(item.rationale)}")

    if result.concerns:
        lines.append("")
        lines.append("Concerns:")
        for item in result.concerns[:8]:
            lines.append(f"- {item}")

    if result.recommended_actions:
        lines.append("")
        lines.append("Recommended actions:")
        for action in result.recommended_actions[:10]:
            lines.append(f"- {action}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:10]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
