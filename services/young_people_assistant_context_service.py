from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from services.young_people_chronology_service import get_young_person_timeline


HIGH_SIGNAL_TYPES = {
    "incident",
    "safeguarding",
    "safeguarding_record",
    "risk",
    "missing_episode",
    "health",
    "health_record",
}


def _as_text(value: Any) -> str:
    return str(value or "").strip()


def _source_from_event(event: dict[str, Any]) -> dict[str, Any]:
    record_type = _as_text(event.get("record_type") or event.get("category") or "record")
    title = _as_text(event.get("title")) or record_type.replace("_", " ").title()
    summary = _as_text(event.get("summary") or event.get("narrative"))

    return {
        "id": event.get("source_id") or event.get("id"),
        "record_id": event.get("source_id") or event.get("id"),
        "source_id": event.get("source_id") or event.get("id"),
        "record_type": record_type,
        "title": title,
        "label": title,
        "summary": summary,
        "description": summary,
        "excerpt": summary[:700],
        "date": event.get("occurred_at") or event.get("event_datetime") or event.get("created_at"),
        "created_at": event.get("created_at") or event.get("occurred_at"),
        "source_table": event.get("source_table"),
        "citation_ref": f"{event.get('source_table') or record_type}:{event.get('source_id') or event.get('id')}",
        "evidence_kind": "timeline_record",
    }


def _event_date_key(event: dict[str, Any]) -> str:
    value = _as_text(event.get("occurred_at") or event.get("event_datetime") or event.get("created_at"))
    return value[:10] if value else "unknown"


def _summarise_patterns(events: list[dict[str, Any]]) -> list[str]:
    if not events:
        return []

    category_counts = Counter(
        _as_text(event.get("category") or event.get("record_type") or "record")
        for event in events
    )
    severity_counts = Counter(
        _as_text(event.get("severity") or "medium").lower()
        for event in events
    )
    date_counts = Counter(_event_date_key(event) for event in events)

    patterns: list[str] = []

    most_common = category_counts.most_common(5)
    if most_common:
        parts = [f"{label}: {count}" for label, count in most_common if label]
        if parts:
            patterns.append("Most recorded areas: " + ", ".join(parts) + ".")

    high_count = sum(
        count
        for label, count in severity_counts.items()
        if label in {"high", "critical", "urgent", "significant"}
    )
    if high_count:
        patterns.append(f"There are {high_count} high-significance or urgent timeline entries in the current context window.")

    clustered_days = [day for day, count in date_counts.items() if day != "unknown" and count >= 3]
    if clustered_days:
        patterns.append(
            "There are clusters of multiple records on: " + ", ".join(clustered_days[:5]) + "."
        )

    return patterns


def _risk_flags(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flags: list[dict[str, Any]] = []

    for event in events:
        record_type = _as_text(event.get("record_type") or event.get("category")).lower()
        severity = _as_text(event.get("severity")).lower()
        summary = _as_text(event.get("summary") or event.get("narrative"))

        if record_type not in HIGH_SIGNAL_TYPES and severity not in {"high", "critical", "urgent", "significant"}:
            continue

        flags.append(
            {
                "record_type": record_type or "record",
                "title": _as_text(event.get("title")) or "Risk signal",
                "severity": severity or "medium",
                "date": event.get("occurred_at") or event.get("event_datetime") or event.get("created_at"),
                "summary": summary[:500],
                "source_table": event.get("source_table"),
                "source_id": event.get("source_id") or event.get("id"),
            }
        )

    return flags[:15]


def build_young_person_assistant_context(
    *,
    young_person_id: int,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 120,
) -> dict[str, Any]:
    timeline = get_young_person_timeline(
        young_person_id=young_person_id,
        limit=limit,
    )

    recent_events = timeline[:30]
    sources = [_source_from_event(event) for event in recent_events]
    risk_flags = _risk_flags(timeline)
    patterns = _summarise_patterns(timeline)

    category_counts = Counter(
        _as_text(event.get("category") or event.get("record_type") or "record")
        for event in timeline
    )

    scope_bundle = {
        "timeline": timeline,
        "recent_events": recent_events,
        "risk_flags": risk_flags,
        "patterns": patterns,
        "counts_by_category": dict(category_counts),
    }

    return {
        "status": "ok",
        "scope": "child",
        "young_person_id": young_person_id,
        "home_id": home_id,
        "provider_id": provider_id,
        "context": scope_bundle,
        "scope_bundle": scope_bundle,
        "bundle": scope_bundle,
        "timeline": timeline,
        "recent_events": recent_events,
        "risk_flags": risk_flags,
        "patterns": patterns,
        "items": sources,
        "sources": sources,
        "warnings": [],
        "assistant_context": {
            "summary": "Unified child context built from chronology and care records.",
            "recent_event_count": len(recent_events),
            "total_timeline_count": len(timeline),
            "risk_flag_count": len(risk_flags),
            "patterns": patterns,
        },
        "runtime": {
            "source": "young_people_assistant_context_service",
            "retrieval_mode": "unified_timeline",
            "evidence_count": len(sources),
            "timeline_count": len(timeline),
            "risk_flag_count": len(risk_flags),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
        },
    }
