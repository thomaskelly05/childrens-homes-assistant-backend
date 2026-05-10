from __future__ import annotations

"""Risk trajectory analysis for IndiCare OS assistant.

This module reviews visible OS evidence over time and gives a conservative view
of whether risk appears escalating, reducing, stable or unclear. It does not make
final safeguarding threshold decisions and must be used with professional review.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


ESCALATION_TERMS = {
    "missing",
    "abscond",
    "police",
    "exploitation",
    "self-harm",
    "suicidal",
    "injury",
    "assault",
    "weapon",
    "restraint",
    "allegation",
    "hospital",
    "urgent",
    "escalat",
    "deterior",
    "unsafe",
    "unknown adult",
    "county lines",
    "overdue",
}

REDUCTION_TERMS = {
    "settled",
    "calm",
    "improved",
    "progress",
    "reduced",
    "decreased",
    "engaged",
    "positive",
    "completed",
    "reviewed",
    "safety plan updated",
    "risk assessment updated",
    "manager reviewed",
}

RISK_RECORD_TYPES = {
    "incident",
    "missing_episode",
    "safeguarding_record",
    "risk",
    "risk_assessment",
    "daily_note",
    "handover",
    "handover_record",
    "manager_action",
    "task",
}


@dataclass(frozen=True)
class RiskTrajectoryPoint:
    citation_ref: str
    date: str
    record_type: str
    label: str
    excerpt: str
    risk_score: int
    direction_signal: str


@dataclass(frozen=True)
class RiskTrajectoryResult:
    trajectory: str
    confidence: str
    evidence_count: int
    points: list[RiskTrajectoryPoint] = field(default_factory=list)
    rationale: list[str] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())

    text = _safe_string(value)
    if not text:
        return None

    for candidate in (text, text.replace("Z", "+00:00"), text[:10]):
        try:
            if len(candidate) == 10 and "-" in candidate:
                return datetime.combine(date.fromisoformat(candidate), datetime.min.time())
            return datetime.fromisoformat(candidate)
        except Exception:
            continue
    return None


def _normalise_date(value: Any) -> str:
    parsed = _parse_datetime(value)
    return parsed.isoformat() if parsed else ""


def _citation_ref(item: dict[str, Any]) -> str:
    citation = _safe_string(item.get("citation_ref"))
    if citation:
        return citation
    record_type = _safe_string(item.get("record_type") or item.get("type"))
    record_id = _safe_string(item.get("record_id") or item.get("id"))
    if record_type and record_id:
        return f"[{record_type}:{record_id}]"
    return ""


def _text(item: dict[str, Any]) -> str:
    return " ".join(
        _safe_string(item.get(key))
        for key in ("label", "title", "excerpt", "summary", "description", "outcome", "notes")
    ).lower()


def _risk_score_and_signal(item: dict[str, Any]) -> tuple[int, str]:
    text = _text(item)
    record_type = _safe_string(item.get("record_type") or item.get("type")).lower()

    score = 0
    escalation_hits = sum(1 for term in ESCALATION_TERMS if term in text)
    reduction_hits = sum(1 for term in REDUCTION_TERMS if term in text)

    score += escalation_hits * 2
    score -= reduction_hits

    if record_type in {"incident", "missing_episode", "safeguarding_record"}:
        score += 3
    elif record_type in {"risk", "risk_assessment"}:
        score += 2
    elif record_type in {"manager_action", "task"} and reduction_hits:
        score -= 1

    if score >= 4:
        signal = "risk_increase"
    elif score <= -1:
        signal = "risk_reduction_or_control"
    else:
        signal = "neutral_or_context"

    return score, signal


def _point_from_item(item: dict[str, Any]) -> RiskTrajectoryPoint | None:
    if not isinstance(item, dict):
        return None

    citation_ref = _citation_ref(item)
    if not citation_ref:
        return None

    record_type = _safe_string(item.get("record_type") or item.get("type") or "record").lower()
    text = _text(item)
    if record_type not in RISK_RECORD_TYPES and not any(term in text for term in ESCALATION_TERMS | REDUCTION_TERMS):
        return None

    score, signal = _risk_score_and_signal(item)
    return RiskTrajectoryPoint(
        citation_ref=citation_ref,
        date=_normalise_date(item.get("date") or item.get("event_at") or item.get("updated_at")),
        record_type=record_type,
        label=_safe_string(item.get("label") or item.get("title") or record_type or "Record"),
        excerpt=_safe_string(item.get("excerpt") or item.get("summary") or item.get("description") or item.get("notes"))[:360],
        risk_score=score,
        direction_signal=signal,
    )


def _derive_trajectory(points: list[RiskTrajectoryPoint]) -> tuple[str, str, list[str]]:
    if not points:
        return "unknown", "low", ["No usable cited risk evidence was visible."]

    sorted_points = sorted(points, key=lambda point: point.date or "")
    midpoint = max(1, len(sorted_points) // 2)
    earlier = sorted_points[:midpoint]
    later = sorted_points[midpoint:]

    earlier_score = sum(point.risk_score for point in earlier) / max(1, len(earlier))
    later_score = sum(point.risk_score for point in later) / max(1, len(later))
    delta = later_score - earlier_score

    increase_count = len([point for point in sorted_points if point.direction_signal == "risk_increase"])
    reduction_count = len([point for point in sorted_points if point.direction_signal == "risk_reduction_or_control"])

    rationale = [
        f"Earlier average risk signal: {earlier_score:.1f}.",
        f"Later average risk signal: {later_score:.1f}.",
        f"Risk increase signals: {increase_count}; risk reduction/control signals: {reduction_count}.",
    ]

    if delta >= 2 or (increase_count >= 2 and increase_count > reduction_count):
        trajectory = "escalating"
    elif delta <= -2 or (reduction_count >= 2 and reduction_count > increase_count):
        trajectory = "reducing_or_better_controlled"
    elif len(sorted_points) >= 3:
        trajectory = "broadly_stable_or_mixed"
    else:
        trajectory = "unclear_limited_evidence"

    if len(sorted_points) >= 6:
        confidence = "medium"
    elif len(sorted_points) >= 3:
        confidence = "working"
    else:
        confidence = "low"

    return trajectory, confidence, rationale


def _recommended_actions(trajectory: str) -> list[str]:
    if trajectory == "escalating":
        return [
            "Review immediate safety, supervision and current risk controls.",
            "Ask the manager or on-call lead to review escalation and follow-through evidence.",
            "Check whether risk assessments, care plans and safeguarding actions need updating.",
            "Confirm who has been informed and whether social worker or multi-agency escalation is needed.",
        ]
    if trajectory == "reducing_or_better_controlled":
        return [
            "Identify what appears to be helping and ensure it is reflected in the care plan.",
            "Continue monitoring to ensure progress is sustained.",
            "Record evidence of impact, not only actions completed.",
        ]
    if trajectory == "broadly_stable_or_mixed":
        return [
            "Review whether risk controls are consistently effective or whether patterns remain unresolved.",
            "Check if management actions have clear owners, timescales and review points.",
        ]
    return [
        "Add or review visible evidence before making risk trajectory conclusions.",
    ]


def build_risk_trajectory(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 30,
) -> RiskTrajectoryResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return RiskTrajectoryResult(
            trajectory="unknown",
            confidence="low",
            evidence_count=0,
            points=[],
            rationale=["No visible OS evidence was provided."],
            recommended_actions=_recommended_actions("unknown"),
            warnings=["no_visible_evidence_for_risk_trajectory"],
        )

    points = [point for item in evidence if (point := _point_from_item(item)) is not None]
    points = sorted(points, key=lambda point: point.date or "", reverse=True)[: max(1, min(int(limit), 100))]

    trajectory, confidence, rationale = _derive_trajectory(points)
    warnings: list[str] = []
    if not points:
        warnings.append("no_usable_risk_evidence_for_trajectory")
    if len(points) < 3:
        warnings.append("limited_risk_trajectory_evidence")

    return RiskTrajectoryResult(
        trajectory=trajectory,
        confidence=confidence,
        evidence_count=len(evidence),
        points=points,
        rationale=rationale,
        recommended_actions=_recommended_actions(trajectory),
        warnings=warnings,
    )


def serialise_risk_trajectory(result: RiskTrajectoryResult) -> dict[str, Any]:
    return {
        "trajectory": result.trajectory,
        "confidence": result.confidence,
        "evidence_count": result.evidence_count,
        "rationale": result.rationale,
        "recommended_actions": result.recommended_actions,
        "warnings": result.warnings,
        "points": [
            {
                "citation_ref": point.citation_ref,
                "date": point.date,
                "record_type": point.record_type,
                "label": point.label,
                "excerpt": point.excerpt,
                "risk_score": point.risk_score,
                "direction_signal": point.direction_signal,
            }
            for point in result.points
        ],
    }


def build_risk_trajectory_prompt_block(result: RiskTrajectoryResult) -> str:
    lines = [
        "RISK TRAJECTORY CONTEXT",
        "Use this conservatively. Do not make final safeguarding threshold decisions.",
        f"Trajectory: {result.trajectory}. Confidence: {result.confidence}.",
        "",
    ]

    if result.rationale:
        lines.append("Rationale:")
        for item in result.rationale:
            lines.append(f"- {item}")

    if result.points:
        lines.append("")
        lines.append("Risk trajectory points:")
        for point in result.points[:12]:
            date_label = point.date or "date not visible"
            excerpt = f" — {point.excerpt}" if point.excerpt else ""
            lines.append(f"- {point.direction_signal} ({date_label}){excerpt} {point.citation_ref}")

    if result.recommended_actions:
        lines.append("")
        lines.append("Recommended professional review actions:")
        for action in result.recommended_actions:
            lines.append(f"- {action}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
