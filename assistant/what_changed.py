from __future__ import annotations

"""What-changed intelligence for IndiCare OS assistant.

This module summarises recent visible movement across OS evidence. It is useful
for questions such as:
- What changed this week?
- What changed since the last shift?
- What has deteriorated or improved?
- What needs manager attention now?

It only uses visible evidence items and keeps citations attached.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any

from assistant.pattern_detection import detect_patterns, serialise_pattern_detection
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation


CHANGE_DOMAINS: dict[str, set[str]] = {
    "safeguarding_or_risk": {
        "safeguarding",
        "risk",
        "missing",
        "abscond",
        "police",
        "exploitation",
        "self-harm",
        "allegation",
        "injury",
        "restraint",
    },
    "emotional_presentation": {
        "anxious",
        "distressed",
        "tearful",
        "angry",
        "low mood",
        "settled",
        "calm",
        "dysregulated",
        "emotional",
    },
    "education_or_routine": {
        "education",
        "school",
        "college",
        "attendance",
        "routine",
        "morning",
        "sleep",
        "engaged",
    },
    "family_or_relationships": {
        "family",
        "contact",
        "mum",
        "mother",
        "dad",
        "father",
        "sibling",
        "relationship",
        "peer",
    },
    "health_or_wellbeing": {
        "health",
        "appointment",
        "medication",
        "camhs",
        "doctor",
        "dentist",
        "hospital",
        "wellbeing",
    },
    "management_or_actions": {
        "manager",
        "action",
        "follow up",
        "review",
        "task",
        "overdue",
        "oversight",
        "quality",
    },
    "positive_progress": {
        "positive",
        "progress",
        "improved",
        "achievement",
        "engaged",
        "settled",
        "strength",
        "enjoyed",
        "proud",
    },
}


@dataclass(frozen=True)
class ChangeSignal:
    domain: str
    label: str
    date: str
    citation_ref: str
    excerpt: str
    direction: str


@dataclass(frozen=True)
class WhatChangedResult:
    signals: list[ChangeSignal] = field(default_factory=list)
    evidence_count: int = 0
    recent_evidence_count: int = 0
    period_days: int = 7
    safeguarding: dict[str, Any] = field(default_factory=dict)
    patterns: dict[str, Any] = field(default_factory=dict)
    headlines: list[str] = field(default_factory=list)
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
    if parsed is None:
        return ""
    return parsed.isoformat()


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
        for key in ("label", "title", "excerpt", "summary", "description", "outcome", "notes", "section")
    ).lower()


def _excerpt(item: dict[str, Any]) -> str:
    return _safe_string(item.get("excerpt") or item.get("summary") or item.get("description") or item.get("label") or item.get("title"))[:300]


def _direction_for_text(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ("improved", "progress", "settled", "positive", "engaged", "achievement", "calm")):
        return "improving_or_strength"
    if any(term in lowered for term in ("worse", "deterior", "escalat", "missing", "police", "injury", "self-harm", "urgent", "overdue")):
        return "deterioration_or_risk"
    return "change_or_update"


def _recent_items(evidence: list[dict[str, Any]], *, period_days: int) -> list[dict[str, Any]]:
    now = datetime.utcnow()
    cutoff = now - timedelta(days=max(1, int(period_days)))
    recent: list[dict[str, Any]] = []

    for item in evidence:
        if not isinstance(item, dict):
            continue
        parsed = _parse_datetime(item.get("date") or item.get("event_at") or item.get("updated_at"))
        if parsed is None:
            continue
        if parsed.tzinfo is not None:
            parsed = parsed.replace(tzinfo=None)
        if parsed >= cutoff:
            recent.append(item)

    # If dates are old/test data, fall back to latest dated records so the helper is still useful.
    if not recent:
        dated = [item for item in evidence if _parse_datetime(item.get("date") or item.get("event_at") or item.get("updated_at"))]
        recent = sorted(
            dated,
            key=lambda item: _parse_datetime(item.get("date") or item.get("event_at") or item.get("updated_at")) or datetime.min,
            reverse=True,
        )[:10]

    return recent


def _build_signal(item: dict[str, Any], domain: str) -> ChangeSignal | None:
    citation_ref = _citation_ref(item)
    if not citation_ref:
        return None

    text = _combined_text(item)
    label = _safe_string(item.get("label") or item.get("title") or item.get("record_type") or item.get("type") or "Record")
    excerpt = _excerpt(item)

    return ChangeSignal(
        domain=domain,
        label=label,
        date=_normalise_date(item.get("date") or item.get("event_at") or item.get("updated_at")),
        citation_ref=citation_ref,
        excerpt=excerpt,
        direction=_direction_for_text(text),
    )


def build_what_changed(
    *,
    evidence_index: list[dict[str, Any]] | None,
    period_days: int = 7,
    limit: int = 16,
) -> WhatChangedResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return WhatChangedResult(
            signals=[],
            evidence_count=0,
            recent_evidence_count=0,
            period_days=period_days,
            headlines=[],
            warnings=["no_visible_evidence_for_what_changed"],
        )

    recent = _recent_items(evidence, period_days=period_days)
    signals: list[ChangeSignal] = []
    seen: set[str] = set()

    for item in recent:
        text = _combined_text(item)
        for domain, keywords in CHANGE_DOMAINS.items():
            if any(keyword in text for keyword in keywords):
                signal = _build_signal(item, domain)
                if not signal:
                    continue
                key = f"{signal.domain}|{signal.citation_ref}|{signal.excerpt[:60]}"
                if key in seen:
                    continue
                seen.add(key)
                signals.append(signal)

    direction_weight = {
        "deterioration_or_risk": 3,
        "change_or_update": 2,
        "improving_or_strength": 1,
    }
    signals = sorted(
        signals,
        key=lambda item: (direction_weight.get(item.direction, 0), item.date, item.domain),
        reverse=True,
    )[: max(1, min(int(limit), 50))]

    safeguarding = build_safeguarding_escalation(evidence_index=recent)
    patterns = detect_patterns(evidence_index=recent, min_count=1, limit=6)
    safeguarding_payload = serialise_safeguarding_escalation(safeguarding)
    pattern_payload = serialise_pattern_detection(patterns)

    headlines: list[str] = []
    if safeguarding.level in {"heightened", "urgent"}:
        headlines.append(f"Safeguarding level appears {safeguarding.level} based on recent visible evidence.")

    risk_count = len([item for item in signals if item.direction == "deterioration_or_risk"])
    strength_count = len([item for item in signals if item.direction == "improving_or_strength"])
    if risk_count:
        headlines.append(f"{risk_count} recent change signal(s) suggest deterioration or increased risk.")
    if strength_count:
        headlines.append(f"{strength_count} recent change signal(s) suggest progress or strengths.")

    if not signals:
        headlines.append("No clear recent change signals were detected in the visible evidence.")

    warnings: list[str] = []
    if not recent:
        warnings.append("no_recent_dated_evidence_detected")
    if len(recent) < 3:
        warnings.append("limited_recent_evidence_for_what_changed")

    return WhatChangedResult(
        signals=signals,
        evidence_count=len(evidence),
        recent_evidence_count=len(recent),
        period_days=period_days,
        safeguarding=safeguarding_payload,
        patterns=pattern_payload,
        headlines=headlines,
        warnings=warnings,
    )


def serialise_what_changed(result: WhatChangedResult) -> dict[str, Any]:
    return {
        "evidence_count": result.evidence_count,
        "recent_evidence_count": result.recent_evidence_count,
        "period_days": result.period_days,
        "headlines": result.headlines,
        "warnings": result.warnings,
        "safeguarding": result.safeguarding,
        "patterns": result.patterns,
        "signals": [
            {
                "domain": item.domain,
                "label": item.label,
                "date": item.date,
                "citation_ref": item.citation_ref,
                "excerpt": item.excerpt,
                "direction": item.direction,
            }
            for item in result.signals
        ],
    }


def build_what_changed_prompt_block(result: WhatChangedResult) -> str:
    lines = [
        "WHAT CHANGED CONTEXT",
        "Use this to answer recent-change questions. Keep uncertainty and citations visible.",
        f"Visible evidence: {result.evidence_count}. Recent evidence considered: {result.recent_evidence_count}. Period: {result.period_days} days.",
        "",
    ]

    if result.headlines:
        lines.append("Headlines:")
        for headline in result.headlines:
            lines.append(f"- {headline}")

    if result.signals:
        lines.append("")
        lines.append("Change signals:")
        for signal in result.signals:
            date_label = signal.date or "date not visible"
            excerpt = f" — {signal.excerpt}" if signal.excerpt else ""
            lines.append(f"- {signal.domain}: {signal.direction} ({date_label}){excerpt} {signal.citation_ref}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
