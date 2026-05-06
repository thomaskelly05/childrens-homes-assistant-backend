from __future__ import annotations

"""Chronology synthesis for IndiCare OS assistant.

This module turns visible OS evidence items into a safe, dated chronology model.
It does not infer that something happened unless the evidence item says it did.
It does not use chat history as evidence.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


SIGNIFICANT_RECORD_TYPES = {
    "incident",
    "missing_episode",
    "safeguarding_record",
    "risk",
    "risk_assessment",
    "daily_note",
    "handover",
    "handover_record",
    "appointment",
    "health_record",
    "education_record",
    "family_contact",
    "keywork",
    "monthly_review",
    "manager_action",
    "task",
    "quality_audit",
    "inspection_action",
    "reg44_visit",
    "reg44_finding",
    "reg45_review",
    "reg45_action",
}

HIGH_PRIORITY_TERMS = {
    "safeguarding",
    "missing",
    "abscond",
    "exploitation",
    "self-harm",
    "suicidal",
    "police",
    "assault",
    "allegation",
    "restraint",
    "injury",
    "risk",
    "escalation",
    "emergency",
    "hospital",
}


@dataclass(frozen=True)
class ChronologyEvent:
    citation_ref: str
    record_type: str
    record_id: str
    label: str
    date: str
    section: str
    excerpt: str
    priority: int
    tags: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ChronologySynthesis:
    events: list[ChronologyEvent]
    evidence_count: int
    included_count: int
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


def _priority_for_item(item: dict[str, Any]) -> tuple[int, list[str]]:
    record_type = _safe_string(item.get("record_type") or item.get("type")).lower()
    text = " ".join(
        _safe_string(item.get(key)).lower()
        for key in ("label", "title", "excerpt", "summary", "description")
    )

    priority = 0
    tags: list[str] = []

    if record_type in {"incident", "missing_episode", "safeguarding_record"}:
        priority += 5
        tags.append("safeguarding_relevant")
    elif record_type in {"risk", "risk_assessment"}:
        priority += 4
        tags.append("risk_relevant")
    elif record_type in {"manager_action", "inspection_action", "reg45_action", "task"}:
        priority += 3
        tags.append("action_relevant")
    elif record_type in {"daily_note", "handover", "handover_record"}:
        priority += 2
        tags.append("daily_care_relevant")
    else:
        priority += 1

    for term in HIGH_PRIORITY_TERMS:
        if term in text:
            priority += 1
            tags.append(term.replace("-", "_"))

    return priority, sorted(set(tags))


def _event_from_evidence(item: dict[str, Any]) -> ChronologyEvent | None:
    if not isinstance(item, dict):
        return None

    citation_ref = _citation_ref(item)
    if not citation_ref:
        return None

    record_type = _safe_string(item.get("record_type") or item.get("type")).lower()
    if record_type and record_type not in SIGNIFICANT_RECORD_TYPES:
        # Keep unknown records only if they have a date and useful text.
        has_text = bool(_safe_string(item.get("excerpt") or item.get("summary") or item.get("description")))
        has_date = bool(_normalise_date(item.get("date") or item.get("event_at") or item.get("updated_at")))
        if not (has_text and has_date):
            return None

    date_value = _normalise_date(item.get("date") or item.get("event_at") or item.get("updated_at"))
    priority, tags = _priority_for_item(item)

    return ChronologyEvent(
        citation_ref=citation_ref,
        record_type=record_type or "record",
        record_id=_safe_string(item.get("record_id") or item.get("id")),
        label=_safe_string(item.get("label") or item.get("title") or record_type or "Record"),
        date=date_value,
        section=_safe_string(item.get("section")),
        excerpt=_safe_string(item.get("excerpt") or item.get("summary") or item.get("description"))[:420],
        priority=priority,
        tags=tags,
    )


def build_chronology_synthesis(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 30,
    reverse: bool = False,
) -> ChronologySynthesis:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    warnings: list[str] = []

    if not evidence:
        return ChronologySynthesis(
            events=[],
            evidence_count=0,
            included_count=0,
            warnings=["no_visible_evidence_for_chronology"],
        )

    events = [event for item in evidence if (event := _event_from_evidence(item)) is not None]

    if not events:
        return ChronologySynthesis(
            events=[],
            evidence_count=len(evidence),
            included_count=0,
            warnings=["no_usable_dated_or_cited_events"],
        )

    if any(not event.date for event in events):
        warnings.append("some_events_have_no_visible_date")

    def sort_key(event: ChronologyEvent) -> tuple[str, int, str]:
        return (event.date or "", event.priority, event.citation_ref)

    events = sorted(events, key=sort_key, reverse=not reverse)
    safe_limit = max(1, min(int(limit), 100))
    included = events[:safe_limit]

    return ChronologySynthesis(
        events=included,
        evidence_count=len(evidence),
        included_count=len(included),
        warnings=warnings,
    )


def serialise_chronology_synthesis(synthesis: ChronologySynthesis) -> dict[str, Any]:
    return {
        "evidence_count": synthesis.evidence_count,
        "included_count": synthesis.included_count,
        "warnings": synthesis.warnings,
        "events": [
            {
                "citation_ref": event.citation_ref,
                "record_type": event.record_type,
                "record_id": event.record_id,
                "label": event.label,
                "date": event.date,
                "section": event.section,
                "excerpt": event.excerpt,
                "priority": event.priority,
                "tags": event.tags,
            }
            for event in synthesis.events
        ],
    }


def build_chronology_prompt_block(synthesis: ChronologySynthesis) -> str:
    if not synthesis.events:
        return ""

    lines = [
        "CHRONOLOGY EVIDENCE",
        "Use this only as visible OS evidence. Do not add events that are not listed here.",
        "Keep dates, uncertainty and citations visible.",
        "",
    ]

    for event in synthesis.events:
        date_label = event.date or "date not visible"
        label = event.label or event.record_type
        excerpt = f" — {event.excerpt}" if event.excerpt else ""
        lines.append(f"- {date_label}: {label}{excerpt} {event.citation_ref}")

    if synthesis.warnings:
        lines.append("")
        lines.append("Chronology warnings:")
        for warning in synthesis.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
