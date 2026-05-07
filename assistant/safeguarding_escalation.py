from __future__ import annotations

"""Safeguarding escalation analysis for IndiCare OS assistant.

This module reviews visible OS evidence and produces a conservative, cited
safeguarding escalation model. It does not decide thresholds for professionals;
it highlights indicators, urgency and safe actions that require human review.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any


URGENT_TERMS = {
    "immediate danger",
    "emergency",
    "999",
    "serious injury",
    "hospital",
    "suicidal",
    "suicide",
    "ligature",
    "overdose",
    "weapon",
    "assault",
    "sexual exploitation",
    "criminal exploitation",
    "missing overnight",
    "not returned",
    "police",
}

HEIGHTENED_TERMS = {
    "missing",
    "abscond",
    "exploitation",
    "self-harm",
    "harm",
    "allegation",
    "restraint",
    "injury",
    "substance",
    "county lines",
    "unknown adult",
    "unsafe contact",
    "threat",
    "bullying",
    "domestic abuse",
    "radicalisation",
    "online risk",
}

MANAGEMENT_TERMS = {
    "manager",
    "on-call",
    "on call",
    "social worker",
    "placing authority",
    "lado",
    "ofsted",
    "notification",
    "strategy meeting",
    "multi-agency",
    "police",
}

SAFEGUARDING_RECORD_TYPES = {
    "incident",
    "missing_episode",
    "safeguarding_record",
    "risk",
    "risk_assessment",
    "manager_action",
    "inspection_action",
    "task",
    "daily_note",
    "handover",
    "handover_record",
}


@dataclass(frozen=True)
class SafeguardingIndicator:
    citation_ref: str
    record_type: str
    label: str
    date: str
    indicator: str
    severity: str
    excerpt: str


@dataclass(frozen=True)
class SafeguardingEscalation:
    level: str
    indicators: list[SafeguardingIndicator] = field(default_factory=list)
    recommended_actions: list[str] = field(default_factory=list)
    evidence_count: int = 0
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


def _combined_text(item: dict[str, Any]) -> str:
    return " ".join(
        _safe_string(item.get(key))
        for key in ("label", "title", "excerpt", "summary", "description", "outcome", "notes")
    ).lower()


def _is_recent(item: dict[str, Any], *, within_days: int = 7) -> bool:
    parsed = _parse_datetime(item.get("date") or item.get("event_at") or item.get("updated_at"))
    if parsed is None:
        return False

    # Keep timezone-naive comparison deliberately simple and conservative.
    now = datetime.utcnow()
    if parsed.tzinfo is not None:
        parsed = parsed.replace(tzinfo=None)
    return parsed >= now - timedelta(days=within_days)


def _indicator_from_item(item: dict[str, Any]) -> list[SafeguardingIndicator]:
    if not isinstance(item, dict):
        return []

    citation_ref = _citation_ref(item)
    if not citation_ref:
        return []

    record_type = _safe_string(item.get("record_type") or item.get("type")).lower()
    text = _combined_text(item)
    if record_type not in SAFEGUARDING_RECORD_TYPES and not any(term in text for term in HEIGHTENED_TERMS | URGENT_TERMS):
        return []

    label = _safe_string(item.get("label") or item.get("title") or record_type or "Record")
    date_value = _normalise_date(item.get("date") or item.get("event_at") or item.get("updated_at"))
    excerpt = _safe_string(item.get("excerpt") or item.get("summary") or item.get("description") or item.get("notes"))[:420]

    indicators: list[SafeguardingIndicator] = []

    for term in sorted(URGENT_TERMS):
        if term in text:
            indicators.append(
                SafeguardingIndicator(
                    citation_ref=citation_ref,
                    record_type=record_type or "record",
                    label=label,
                    date=date_value,
                    indicator=term,
                    severity="urgent",
                    excerpt=excerpt,
                )
            )

    for term in sorted(HEIGHTENED_TERMS):
        if term in text:
            indicators.append(
                SafeguardingIndicator(
                    citation_ref=citation_ref,
                    record_type=record_type or "record",
                    label=label,
                    date=date_value,
                    indicator=term,
                    severity="heightened",
                    excerpt=excerpt,
                )
            )

    if record_type in {"incident", "missing_episode", "safeguarding_record"} and not indicators:
        indicators.append(
            SafeguardingIndicator(
                citation_ref=citation_ref,
                record_type=record_type,
                label=label,
                date=date_value,
                indicator=record_type,
                severity="heightened" if _is_recent(item) else "review",
                excerpt=excerpt,
            )
        )

    return indicators


def _derive_level(indicators: list[SafeguardingIndicator]) -> str:
    if any(item.severity == "urgent" for item in indicators):
        return "urgent"
    if any(item.severity == "heightened" for item in indicators):
        return "heightened"
    if indicators:
        return "review"
    return "normal"


def _recommended_actions(level: str, indicators: list[SafeguardingIndicator]) -> list[str]:
    if level == "normal":
        return []

    actions = [
        "Check immediate safety and supervision arrangements.",
        "Inform the manager or on-call lead in line with the home’s safeguarding procedure.",
        "Record facts, times, actions taken, people informed and current outcome.",
        "Review whether the social worker, placing authority or relevant professionals need updating.",
    ]

    indicator_terms = {item.indicator for item in indicators}

    if level == "urgent":
        actions.insert(0, "If there is immediate danger or medical emergency, contact emergency services now.")

    if {"police", "missing", "abscond", "missing overnight", "not returned"} & indicator_terms:
        actions.append("Review missing-from-care procedures, police involvement and return-home interview arrangements.")

    if {"allegation", "sexual exploitation", "criminal exploitation", "county lines", "unknown adult"} & indicator_terms:
        actions.append("Consider LADO, multi-agency safeguarding and exploitation procedures where thresholds may be met.")

    if {"ofsted", "notification", "serious injury", "hospital"} & indicator_terms:
        actions.append("Manager should consider whether Regulation 40 notification advice is required before deciding.")

    result: list[str] = []
    seen: set[str] = set()
    for action in actions:
        key = action.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(action)
    return result


def build_safeguarding_escalation(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 20,
) -> SafeguardingEscalation:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return SafeguardingEscalation(
            level="unknown",
            indicators=[],
            recommended_actions=[
                "No visible OS evidence was provided. Do not make record-specific safeguarding conclusions without evidence.",
            ],
            evidence_count=0,
            warnings=["no_visible_evidence_for_safeguarding_analysis"],
        )

    indicators: list[SafeguardingIndicator] = []
    for item in evidence:
        indicators.extend(_indicator_from_item(item))

    # Sort urgent first, then most recent dates where visible.
    severity_weight = {"urgent": 3, "heightened": 2, "review": 1}
    indicators = sorted(
        indicators,
        key=lambda item: (severity_weight.get(item.severity, 0), item.date, item.citation_ref),
        reverse=True,
    )

    safe_limit = max(1, min(int(limit), 100))
    indicators = indicators[:safe_limit]
    level = _derive_level(indicators)

    return SafeguardingEscalation(
        level=level,
        indicators=indicators,
        recommended_actions=_recommended_actions(level, indicators),
        evidence_count=len(evidence),
        warnings=[] if indicators else ["no_safeguarding_indicators_detected_in_visible_evidence"],
    )


def serialise_safeguarding_escalation(escalation: SafeguardingEscalation) -> dict[str, Any]:
    return {
        "level": escalation.level,
        "evidence_count": escalation.evidence_count,
        "warnings": escalation.warnings,
        "recommended_actions": escalation.recommended_actions,
        "indicators": [
            {
                "citation_ref": item.citation_ref,
                "record_type": item.record_type,
                "label": item.label,
                "date": item.date,
                "indicator": item.indicator,
                "severity": item.severity,
                "excerpt": item.excerpt,
            }
            for item in escalation.indicators
        ],
    }


def build_safeguarding_prompt_block(escalation: SafeguardingEscalation) -> str:
    if escalation.level in {"normal"} and not escalation.indicators:
        return ""

    lines = [
        "SAFEGUARDING ESCALATION CONTEXT",
        f"Detected level: {escalation.level}",
        "Use this conservatively. Do not make final threshold decisions for professionals.",
        "Distinguish visible evidence from concern, inference and missing information.",
        "",
    ]

    if escalation.indicators:
        lines.append("Visible indicators:")
        for indicator in escalation.indicators:
            date_label = indicator.date or "date not visible"
            excerpt = f" — {indicator.excerpt}" if indicator.excerpt else ""
            lines.append(
                f"- {indicator.severity}: {indicator.indicator} ({date_label}){excerpt} {indicator.citation_ref}"
            )

    if escalation.recommended_actions:
        lines.append("")
        lines.append("Safe action prompts:")
        for action in escalation.recommended_actions:
            lines.append(f"- {action}")

    if escalation.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in escalation.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
