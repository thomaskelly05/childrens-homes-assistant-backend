from __future__ import annotations

"""Smart recommendation engine for IndiCare OS assistant.

This module converts visible operational intelligence into role-aware,
practical recommendations. It does not replace professional judgement and must
not invent evidence. Recommendations should be treated as prompts for review.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.home_quality_trends import build_home_quality_trend, serialise_home_quality_trend
from assistant.inspection_readiness import build_inspection_readiness, serialise_inspection_readiness
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


ROLE_GROUPS = {
    "rsw": "frontline",
    "residential support worker": "frontline",
    "support worker": "frontline",
    "senior": "shift_lead",
    "shift lead": "shift_lead",
    "manager": "manager",
    "registered manager": "manager",
    "ri": "provider",
    "responsible individual": "provider",
    "provider": "provider",
    "quality lead": "quality",
    "quality": "quality",
}


@dataclass(frozen=True)
class SmartRecommendation:
    title: str
    recommendation: str
    priority: str
    audience: str
    reason: str
    evidence_refs: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class SmartRecommendationResult:
    recommendations: list[SmartRecommendation] = field(default_factory=list)
    role_group: str = "general"
    evidence_count: int = 0
    intelligence: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _role_group(user_role: str) -> str:
    return ROLE_GROUPS.get(_safe_string(user_role).lower(), "general")


def _dedupe_recommendations(items: list[SmartRecommendation]) -> list[SmartRecommendation]:
    result: list[SmartRecommendation] = []
    seen: set[str] = set()
    for item in items:
        key = f"{item.title}|{item.recommendation}|{item.audience}".lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def _refs_from_payload(payload: dict[str, Any], key: str = "citation_ref", limit: int = 4) -> list[str]:
    refs: list[str] = []
    for section in ("indicators", "points", "findings", "actions"):
        value = payload.get(section)
        if not isinstance(value, list):
            continue
        for item in value:
            if not isinstance(item, dict):
                continue
            ref = _safe_string(item.get(key))
            if not ref and isinstance(item.get("citation_refs"), list):
                for candidate in item.get("citation_refs", []):
                    ref = _safe_string(candidate)
                    if ref and ref not in refs:
                        refs.append(ref)
            elif ref and ref not in refs:
                refs.append(ref)
            if len(refs) >= limit:
                return refs[:limit]
    return refs[:limit]


def build_smart_recommendations(
    *,
    evidence_index: list[dict[str, Any]] | None,
    user_role: str = "general",
) -> SmartRecommendationResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    role_group = _role_group(user_role)

    if not evidence:
        return SmartRecommendationResult(
            recommendations=[
                SmartRecommendation(
                    title="Add visible evidence first",
                    recommendation="Attach or retrieve scoped OS evidence before asking for operational conclusions.",
                    priority="high",
                    audience=role_group,
                    reason="No visible evidence was provided, so record-specific recommendations would be unsafe.",
                    evidence_refs=[],
                )
            ],
            role_group=role_group,
            evidence_count=0,
            warnings=["no_visible_evidence_for_smart_recommendations"],
        )

    safeguarding = build_safeguarding_escalation(evidence_index=evidence)
    risk = build_risk_trajectory(evidence_index=evidence)
    oversight = build_management_oversight(evidence_index=evidence)
    actions = extract_actions(evidence_index=evidence)
    readiness = build_inspection_readiness(evidence_index=evidence)
    home_trend = build_home_quality_trend(evidence_index=evidence)

    safeguarding_payload = serialise_safeguarding_escalation(safeguarding)
    risk_payload = serialise_risk_trajectory(risk)
    oversight_payload = serialise_management_oversight(oversight)
    action_payload = serialise_action_extraction(actions)
    readiness_payload = serialise_inspection_readiness(readiness)
    home_payload = serialise_home_quality_trend(home_trend)

    recommendations: list[SmartRecommendation] = []

    if safeguarding.level in {"urgent", "heightened"}:
        recommendations.append(
            SmartRecommendation(
                title="Review safeguarding escalation now",
                recommendation="Check immediate safety, supervision, manager/on-call notification and whether external safeguarding or emergency procedures are required.",
                priority="urgent" if safeguarding.level == "urgent" else "high",
                audience="frontline" if role_group in {"frontline", "shift_lead"} else "manager",
                reason=f"Safeguarding level is {safeguarding.level} based on visible indicators.",
                evidence_refs=_refs_from_payload(safeguarding_payload),
            )
        )

    if risk.trajectory == "escalating":
        recommendations.append(
            SmartRecommendation(
                title="Review risk trajectory and controls",
                recommendation="Review whether current risk controls, care planning and management follow-through remain sufficient.",
                priority="high",
                audience="manager",
                reason="Risk trajectory appears escalating in visible evidence.",
                evidence_refs=_refs_from_payload(risk_payload),
            )
        )

    if oversight.oversight_level in {"weak_or_unclear", "limited_visible_oversight", "developing_with_gaps"}:
        recommendations.append(
            SmartRecommendation(
                title="Strengthen management oversight evidence",
                recommendation="Check that actions show owner, timescale, completion evidence, management sign-off and impact on children.",
                priority="high" if oversight.oversight_level == "weak_or_unclear" else "medium",
                audience="manager",
                reason=f"Management oversight level is {oversight.oversight_level}.",
                evidence_refs=_refs_from_payload(oversight_payload),
            )
        )

    if actions.open_count or actions.gap_count:
        recommendations.append(
            SmartRecommendation(
                title="Review open actions and quality gaps",
                recommendation="Prioritise open actions, clarify owners and due dates, and record follow-through evidence.",
                priority="high" if actions.open_count >= 3 or actions.gap_count >= 3 else "medium",
                audience="shift_lead" if role_group in {"frontline", "shift_lead"} else "manager",
                reason=f"Visible actions: {actions.open_count} open and {actions.gap_count} quality gap(s).",
                evidence_refs=_refs_from_payload(action_payload),
            )
        )

    if readiness.overall_level in {"weak", "limited"}:
        recommendations.append(
            SmartRecommendation(
                title="Improve inspection evidence preparation evidence",
                recommendation="Address visible evidence gaps across safeguarding, leadership, workforce, care planning and quality assurance before relying on the review output.",
                priority="high",
                audience="provider" if role_group == "provider" else "manager",
                reason=f"Inspection evidence preparation appears {readiness.overall_level}.",
                evidence_refs=[],
            )
        )

    if home_trend.trend in {"deteriorating_or_high_attention", "watching_brief"}:
        recommendations.append(
            SmartRecommendation(
                title="Place this home on a management watching brief",
                recommendation="Set a short review cycle, check safeguarding grip, action drift, management oversight and evidence quality.",
                priority="high",
                audience="provider" if role_group == "provider" else "manager",
                reason=f"Home quality trend appears {home_trend.trend.replace('_', ' ')}.",
                evidence_refs=[],
            )
        )

    if role_group == "frontline":
        recommendations.append(
            SmartRecommendation(
                title="Keep recording factual and outcome-focused",
                recommendation="Record what happened, what you observed, what the child said, actions taken, who was informed and the current outcome.",
                priority="medium",
                audience="frontline",
                reason="Frontline records are key evidence for safeguarding, care planning and oversight.",
                evidence_refs=[],
            )
        )

    if role_group == "provider":
        recommendations.append(
            SmartRecommendation(
                title="Check provider-level assurance",
                recommendation="Review whether the RI/provider has enough evidence of impact, challenge and follow-through across safeguarding and quality actions.",
                priority="medium",
                audience="provider",
                reason="Provider assurance should evidence oversight, challenge and impact, not only activity.",
                evidence_refs=[],
            )
        )

    warnings: list[str] = []
    for payload in (safeguarding_payload, risk_payload, oversight_payload, action_payload, readiness_payload, home_payload):
        value = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(value, list):
            warnings.extend(str(item) for item in value)

    return SmartRecommendationResult(
        recommendations=_dedupe_recommendations(recommendations)[:12],
        role_group=role_group,
        evidence_count=len(evidence),
        intelligence={
            "safeguarding": safeguarding_payload,
            "risk_trajectory": risk_payload,
            "management_oversight": oversight_payload,
            "actions": action_payload,
            "inspection_readiness": readiness_payload,
            "home_quality_trend": home_payload,
        },
        warnings=sorted(set(warnings)),
    )


def serialise_smart_recommendations(result: SmartRecommendationResult) -> dict[str, Any]:
    return {
        "role_group": result.role_group,
        "evidence_count": result.evidence_count,
        "warnings": result.warnings,
        "intelligence": result.intelligence,
        "recommendations": [
            {
                "title": item.title,
                "recommendation": item.recommendation,
                "priority": item.priority,
                "audience": item.audience,
                "reason": item.reason,
                "evidence_refs": item.evidence_refs,
            }
            for item in result.recommendations
        ],
    }


def build_smart_recommendations_prompt_block(result: SmartRecommendationResult) -> str:
    lines = [
        "SMART RECOMMENDATIONS CONTEXT",
        "Use these as practical recommendations for professional review. Do not present them as final decisions.",
        f"Role group: {result.role_group}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.recommendations:
        lines.append("Recommendations:")
        for item in result.recommendations[:12]:
            refs = " ".join(item.evidence_refs)
            lines.append(
                f"- {item.priority.upper()} [{item.audience}] {item.title}: {item.recommendation} Reason: {item.reason}. {refs}".strip()
            )

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
