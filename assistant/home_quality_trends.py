from __future__ import annotations

"""Home quality trend intelligence for IndiCare OS assistant.

This module aggregates visible home-level evidence into a conservative quality
trend view. It is designed for managers, RIs, providers and quality leads.
It does not predict Ofsted outcomes; it highlights visible trend direction,
strengths, vulnerabilities and actions for professional review.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.inspection_readiness import build_inspection_readiness, serialise_inspection_readiness
from assistant.management_oversight import build_management_oversight, serialise_management_oversight
from assistant.pattern_detection import detect_patterns, serialise_pattern_detection
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


@dataclass(frozen=True)
class HomeQualityTrendResult:
    trend: str
    confidence: str
    evidence_count: int
    headlines: list[str] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    vulnerabilities: list[str] = field(default_factory=list)
    priority_actions: list[str] = field(default_factory=list)
    safeguarding: dict[str, Any] = field(default_factory=dict)
    risk_trajectory: dict[str, Any] = field(default_factory=dict)
    inspection_readiness: dict[str, Any] = field(default_factory=dict)
    management_oversight: dict[str, Any] = field(default_factory=dict)
    actions: dict[str, Any] = field(default_factory=dict)
    patterns: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


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


def _derive_trend(
    *,
    safeguarding_level: str,
    risk_trajectory: str,
    inspection_level: str,
    oversight_level: str,
    open_actions: int,
    action_gaps: int,
) -> tuple[str, str, list[str]]:
    risk_points = 0
    reasons: list[str] = []

    if safeguarding_level == "urgent":
        risk_points += 4
        reasons.append("urgent safeguarding indicators are visible")
    elif safeguarding_level == "heightened":
        risk_points += 3
        reasons.append("heightened safeguarding indicators are visible")

    if risk_trajectory == "escalating":
        risk_points += 3
        reasons.append("risk trajectory appears escalating")
    elif risk_trajectory == "reducing_or_better_controlled":
        risk_points -= 2
        reasons.append("risk trajectory appears reducing or better controlled")

    if inspection_level in {"weak", "limited"}:
        risk_points += 2
        reasons.append("Inspection evidence preparation appears limited or weak")
    elif inspection_level == "strong":
        risk_points -= 2
        reasons.append("Inspection evidence preparation appears strong")

    if oversight_level in {"weak_or_unclear", "limited_visible_oversight"}:
        risk_points += 2
        reasons.append("management oversight appears weak or limited")
    elif oversight_level == "visible_grip":
        risk_points -= 2
        reasons.append("visible management grip is present")

    if open_actions >= 5:
        risk_points += 2
        reasons.append("multiple open actions are visible")
    if action_gaps >= 5:
        risk_points += 2
        reasons.append("multiple action quality gaps are visible")

    if risk_points >= 6:
        trend = "deteriorating_or_high_attention"
    elif risk_points >= 3:
        trend = "watching_brief"
    elif risk_points <= -2:
        trend = "improving_or_well_controlled"
    else:
        trend = "stable_or_mixed"

    confidence = "medium" if len(reasons) >= 3 else "working" if reasons else "low"
    return trend, confidence, reasons


def build_home_quality_trend(
    *,
    evidence_index: list[dict[str, Any]] | None,
) -> HomeQualityTrendResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return HomeQualityTrendResult(
            trend="unknown",
            confidence="low",
            evidence_count=0,
            warnings=["no_visible_evidence_for_home_quality_trend"],
            priority_actions=["Attach or retrieve visible home evidence before drawing quality trend conclusions."],
        )

    safeguarding = build_safeguarding_escalation(evidence_index=evidence)
    risk = build_risk_trajectory(evidence_index=evidence)
    readiness = build_inspection_readiness(evidence_index=evidence)
    oversight = build_management_oversight(evidence_index=evidence)
    actions = extract_actions(evidence_index=evidence)
    patterns = detect_patterns(evidence_index=evidence, min_count=2, limit=10)

    safeguarding_payload = serialise_safeguarding_escalation(safeguarding)
    risk_payload = serialise_risk_trajectory(risk)
    readiness_payload = serialise_inspection_readiness(readiness)
    oversight_payload = serialise_management_oversight(oversight)
    actions_payload = serialise_action_extraction(actions)
    patterns_payload = serialise_pattern_detection(patterns)

    trend, confidence, reasons = _derive_trend(
        safeguarding_level=safeguarding.level,
        risk_trajectory=risk.trajectory,
        inspection_level=readiness.overall_level,
        oversight_level=oversight.oversight_level,
        open_actions=actions.open_count,
        action_gaps=actions.gap_count,
    )

    headlines = [f"Home quality trend appears {trend.replace('_', ' ')}."]
    headlines.extend(reasons[:5])

    strengths: list[str] = []
    strengths.extend(readiness.strengths[:4])
    strengths.extend(oversight.strengths[:4])
    for finding in patterns_payload.get("findings", [])[:3]:
        if finding.get("theme") == "positive_progress":
            strengths.append(f"Positive progress pattern visible: {finding.get('count')} item(s).")

    vulnerabilities: list[str] = []
    vulnerabilities.extend(readiness.vulnerabilities[:5])
    vulnerabilities.extend(oversight.gaps[:5])
    if risk.trajectory == "escalating":
        vulnerabilities.append("Risk trajectory appears escalating and requires management review.")
    if safeguarding.level in {"heightened", "urgent"}:
        vulnerabilities.append(f"Safeguarding escalation level is {safeguarding.level}.")

    priority_actions: list[str] = []
    priority_actions.extend(readiness.immediate_actions[:6])
    priority_actions.extend(oversight.recommended_actions[:4])
    priority_actions.extend(actions_payload.get("warnings", []))
    priority_actions.extend(risk.recommended_actions[:4])

    warnings = []
    warnings.extend(readiness.warnings)
    warnings.extend(oversight.warnings)
    warnings.extend(actions.warnings)
    warnings.extend(risk.warnings)
    warnings.extend(safeguarding.warnings)

    return HomeQualityTrendResult(
        trend=trend,
        confidence=confidence,
        evidence_count=len(evidence),
        headlines=_dedupe(headlines),
        strengths=_dedupe(strengths)[:8],
        vulnerabilities=_dedupe(vulnerabilities)[:10],
        priority_actions=_dedupe(priority_actions)[:12],
        safeguarding=safeguarding_payload,
        risk_trajectory=risk_payload,
        inspection_readiness=readiness_payload,
        management_oversight=oversight_payload,
        actions=actions_payload,
        patterns=patterns_payload,
        warnings=_dedupe(warnings),
    )


def serialise_home_quality_trend(result: HomeQualityTrendResult) -> dict[str, Any]:
    return {
        "trend": result.trend,
        "confidence": result.confidence,
        "evidence_count": result.evidence_count,
        "headlines": result.headlines,
        "strengths": result.strengths,
        "vulnerabilities": result.vulnerabilities,
        "priority_actions": result.priority_actions,
        "safeguarding": result.safeguarding,
        "risk_trajectory": result.risk_trajectory,
        "inspection_readiness": result.inspection_readiness,
        "management_oversight": result.management_oversight,
        "actions": result.actions,
        "patterns": result.patterns,
        "warnings": result.warnings,
    }


def build_home_quality_trend_prompt_block(result: HomeQualityTrendResult) -> str:
    lines = [
        "HOME QUALITY TREND CONTEXT",
        "Use this as management intelligence only. Do not predict Ofsted grades or make final compliance judgements.",
        f"Trend: {result.trend}. Confidence: {result.confidence}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.headlines:
        lines.append("Headlines:")
        for item in result.headlines:
            lines.append(f"- {item}")

    if result.strengths:
        lines.append("")
        lines.append("Visible strengths:")
        for item in result.strengths[:8]:
            lines.append(f"- {item}")

    if result.vulnerabilities:
        lines.append("")
        lines.append("Visible vulnerabilities:")
        for item in result.vulnerabilities[:10]:
            lines.append(f"- {item}")

    if result.priority_actions:
        lines.append("")
        lines.append("Priority actions:")
        for item in result.priority_actions[:10]:
            lines.append(f"- {item}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:10]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
