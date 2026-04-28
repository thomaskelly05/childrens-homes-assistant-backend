from __future__ import annotations

import datetime
import re
from collections import Counter
from typing import Any


# ============================================================
# CHILD EXPERIENCE INTELLIGENCE
# ============================================================
#
# Purpose:
# This service turns existing young-person records into lived-experience
# intelligence.
#
# It is intentionally rule-based first so it works immediately and safely.
# AI explanation can be layered on later.
#
# It answers:
# - Is this young person's experience improving, stable, declining or escalating?
# - What patterns are showing?
# - What triggers and positive anchors are visible?
# - What should staff and managers look at next?
#
# Important:
# This does not replace professional judgement.
# It supports staff, managers and leaders to notice patterns earlier.
# ============================================================


HIGH_RISK_TERMS = {
    "self harm",
    "self-harm",
    "suicidal",
    "suicide",
    "ligature",
    "missing",
    "abscond",
    "absconded",
    "exploitation",
    "cse",
    "criminal exploitation",
    "violence",
    "assault",
    "restraint",
    "police",
    "substance",
    "overdose",
    "weapon",
    "threat",
    "unsafe",
}

EMOTIONAL_DISTRESS_TERMS = {
    "upset",
    "crying",
    "distressed",
    "angry",
    "shouting",
    "dysregulated",
    "anxious",
    "worried",
    "withdrawn",
    "refused",
    "refusal",
    "isolated",
    "low mood",
    "agitated",
    "overwhelmed",
}

POSITIVE_TERMS = {
    "settled",
    "positive",
    "engaged",
    "calm",
    "happy",
    "regulated",
    "joined",
    "participated",
    "completed",
    "achievement",
    "praised",
    "progress",
    "safe",
    "trusted",
    "opened up",
    "communicated well",
}

COMMON_TRIGGER_TERMS = {
    "family contact",
    "contact",
    "school",
    "education",
    "transition",
    "bedtime",
    "phone",
    "social media",
    "peer",
    "staff change",
    "handover",
    "appointment",
    "visit",
    "boundary",
    "consequence",
    "routine",
}

RELATIONSHIP_TERMS = {
    "keyworker",
    "staff",
    "manager",
    "teacher",
    "social worker",
    "family",
    "mum",
    "dad",
    "carer",
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _lower_text(value: Any) -> str:
    return _safe_string(value).lower()


def _parse_date(value: Any) -> datetime.datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime.datetime):
        return value

    if isinstance(value, datetime.date):
        return datetime.datetime.combine(value, datetime.time.min)

    text = _safe_string(value)
    if not text:
        return None

    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y",
    ):
        try:
            return datetime.datetime.strptime(text[:26], fmt)
        except Exception:
            continue

    try:
        return datetime.datetime.fromisoformat(text.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def _days_ago(value: Any) -> int | None:
    parsed = _parse_date(value)
    if not parsed:
        return None

    now = datetime.datetime.utcnow()
    return max((now - parsed).days, 0)


def _contains_any(text: str, terms: set[str]) -> list[str]:
    lowered = text.lower()
    matches: list[str] = []

    for term in sorted(terms):
        if term in lowered:
            matches.append(term)

    return matches


def _extract_text_from_record(record: dict[str, Any]) -> str:
    parts: list[str] = []

    for key in (
        "title",
        "summary",
        "description",
        "content",
        "note",
        "notes",
        "details",
        "body",
        "incident_summary",
        "actions_taken",
        "manager_review",
        "voice_of_child",
        "presentation",
        "outcome",
    ):
        value = record.get(key)
        if value:
            parts.append(_safe_string(value))

    return "\n".join(part for part in parts if part)


def _record_date(record: dict[str, Any]) -> datetime.datetime | None:
    for key in (
        "event_at",
        "occurred_at",
        "incident_datetime",
        "note_date",
        "created_at",
        "updated_at",
        "date",
    ):
        parsed = _parse_date(record.get(key))
        if parsed:
            return parsed

    return None


def _record_type(record: dict[str, Any], fallback: str = "record") -> str:
    return _safe_string(
        record.get("record_type")
        or record.get("type")
        or record.get("bucket")
        or fallback
    ) or fallback


def _normalise_record(record: Any, fallback_type: str = "record") -> dict[str, Any] | None:
    if not isinstance(record, dict):
        return None

    text = _extract_text_from_record(record)
    date = _record_date(record)

    return {
        "id": record.get("id") or record.get("record_id"),
        "type": _record_type(record, fallback_type),
        "date": date,
        "date_label": date.isoformat() if date else None,
        "days_ago": _days_ago(date),
        "text": text,
        "raw": record,
    }


def _collect_records(context: dict[str, Any]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    buckets = {
        "daily_notes": "daily_note",
        "incidents": "incident",
        "safeguarding": "safeguarding",
        "keywork": "keywork",
        "keywork_sessions": "keywork",
        "education": "education",
        "health": "health",
        "family": "family",
        "contacts": "family_contact",
        "risk": "risk",
        "plans": "plan",
        "reviews": "review",
        "recent_records": "record",
        "timeline": "timeline",
        "chronology": "chronology",
    }

    for key, fallback_type in buckets.items():
        for item in _safe_list(context.get(key)):
            normalised = _normalise_record(item, fallback_type)
            if normalised:
                records.append(normalised)

    # Some context builders use nested record groups.
    child_context = _safe_dict(context.get("child_context"))
    for key, fallback_type in buckets.items():
        for item in _safe_list(child_context.get(key)):
            normalised = _normalise_record(item, fallback_type)
            if normalised:
                records.append(normalised)

    records.sort(
        key=lambda item: item.get("date") or datetime.datetime.min,
        reverse=True,
    )

    return records


def _split_recent_and_previous(
    records: list[dict[str, Any]],
    recent_days: int = 30,
    previous_days: int = 60,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    recent: list[dict[str, Any]] = []
    previous: list[dict[str, Any]] = []

    for record in records:
        days = record.get("days_ago")

        if days is None:
            continue

        if days <= recent_days:
            recent.append(record)
        elif days <= previous_days:
            previous.append(record)

    return recent, previous


def _count_term_hits(records: list[dict[str, Any]], terms: set[str]) -> int:
    total = 0
    for record in records:
        text = _lower_text(record.get("text"))
        total += len(_contains_any(text, terms))
    return total


def _score_direction(recent_score: int, previous_score: int, inverse: bool = False) -> str:
    if recent_score == previous_score:
        return "stable"

    improving = recent_score < previous_score if inverse else recent_score > previous_score

    if improving:
        return "improving"

    return "declining"


def _risk_level(score: int) -> str:
    if score >= 12:
        return "critical"
    if score >= 7:
        return "high"
    if score >= 3:
        return "medium"
    return "low"


def _experience_status(
    *,
    risk_score: int,
    distress_score: int,
    positive_score: int,
    incident_count: int,
) -> str:
    if risk_score >= 12 or incident_count >= 5:
        return "escalating"

    if risk_score >= 7 or distress_score >= 10:
        return "heightened"

    if positive_score >= distress_score and risk_score <= 2:
        return "strengthening"

    if distress_score >= positive_score + 4:
        return "declining"

    return "stable"


def _extract_counter(records: list[dict[str, Any]], terms: set[str]) -> Counter[str]:
    counter: Counter[str] = Counter()

    for record in records:
        text = _lower_text(record.get("text"))
        for match in _contains_any(text, terms):
            counter[match] += 1

    return counter


def _top_counter_items(counter: Counter[str], limit: int = 6) -> list[dict[str, Any]]:
    return [
        {"label": label, "count": count}
        for label, count in counter.most_common(limit)
    ]


def _build_record_refs(records: list[dict[str, Any]], terms: set[str], limit: int = 8) -> list[dict[str, Any]]:
    refs: list[dict[str, Any]] = []

    for record in records:
        text = _lower_text(record.get("text"))
        matches = _contains_any(text, terms)

        if not matches:
            continue

        refs.append(
            {
                "id": record.get("id"),
                "type": record.get("type"),
                "date": record.get("date_label"),
                "matches": matches[:5],
                "excerpt": _safe_string(record.get("text"))[:220],
            }
        )

        if len(refs) >= limit:
            break

    return refs


def _build_recommendations(
    *,
    status: str,
    risk_level: str,
    triggers: list[dict[str, Any]],
    anchors: list[dict[str, Any]],
) -> list[str]:
    recommendations: list[str] = []

    if status in {"escalating", "heightened"} or risk_level in {"high", "critical"}:
        recommendations.append(
            "Review recent incidents, safeguarding records and daily notes to confirm whether management oversight or strategy review is required."
        )

    if triggers:
        trigger_labels = ", ".join(item["label"] for item in triggers[:3])
        recommendations.append(
            f"Explore whether the main visible triggers ({trigger_labels}) are being consistently planned for before they occur."
        )

    if anchors:
        anchor_labels = ", ".join(item["label"] for item in anchors[:3])
        recommendations.append(
            f"Protect and repeat the positive anchors currently linked with stability or engagement ({anchor_labels})."
        )

    recommendations.append(
        "Use this as a professional prompt for reflection, not as a final judgement. Confirm against direct records, staff knowledge and the young person's voice."
    )

    return recommendations


def build_child_experience_intelligence(
    *,
    young_person_id: int,
    context: dict[str, Any],
) -> dict[str, Any]:
    records = _collect_records(context)
    recent_records, previous_records = _split_recent_and_previous(records)

    recent_risk_hits = _count_term_hits(recent_records, HIGH_RISK_TERMS)
    previous_risk_hits = _count_term_hits(previous_records, HIGH_RISK_TERMS)

    recent_distress_hits = _count_term_hits(recent_records, EMOTIONAL_DISTRESS_TERMS)
    previous_distress_hits = _count_term_hits(previous_records, EMOTIONAL_DISTRESS_TERMS)

    recent_positive_hits = _count_term_hits(recent_records, POSITIVE_TERMS)
    previous_positive_hits = _count_term_hits(previous_records, POSITIVE_TERMS)

    recent_incidents = [
        record for record in recent_records
        if _safe_string(record.get("type")).lower() in {"incident", "safeguarding"}
    ]

    trigger_counter = _extract_counter(recent_records, COMMON_TRIGGER_TERMS)
    anchor_counter = _extract_counter(recent_records, POSITIVE_TERMS)
    relationship_counter = _extract_counter(recent_records, RELATIONSHIP_TERMS)

    risk_score = recent_risk_hits + (len(recent_incidents) * 2)
    distress_score = recent_distress_hits
    positive_score = recent_positive_hits

    risk_label = _risk_level(risk_score)

    status = _experience_status(
        risk_score=risk_score,
        distress_score=distress_score,
        positive_score=positive_score,
        incident_count=len(recent_incidents),
    )

    stability_direction = _score_direction(
        recent_score=positive_score,
        previous_score=previous_positive_hits,
        inverse=False,
    )

    distress_direction = _score_direction(
        recent_score=distress_score,
        previous_score=previous_distress_hits,
        inverse=True,
    )

    risk_direction = _score_direction(
        recent_score=recent_risk_hits,
        previous_score=previous_risk_hits,
        inverse=True,
    )

    triggers = _top_counter_items(trigger_counter)
    anchors = _top_counter_items(anchor_counter)
    relationships = _top_counter_items(relationship_counter)

    evidence_refs = {
        "risk": _build_record_refs(recent_records, HIGH_RISK_TERMS),
        "distress": _build_record_refs(recent_records, EMOTIONAL_DISTRESS_TERMS),
        "positive": _build_record_refs(recent_records, POSITIVE_TERMS),
        "triggers": _build_record_refs(recent_records, COMMON_TRIGGER_TERMS),
    }

    recommendations = _build_recommendations(
        status=status,
        risk_level=risk_label,
        triggers=triggers,
        anchors=anchors,
    )

    summary = (
        f"Child Experience Intelligence has reviewed {len(records)} visible records. "
        f"The current lived-experience status appears to be '{status}', with a '{risk_label}' risk signal. "
        f"Stability is {stability_direction}, emotional distress is {distress_direction}, "
        f"and risk trajectory is {risk_direction} across the visible recent records."
    )

    return {
        "young_person_id": young_person_id,
        "status": status,
        "summary": summary,
        "scores": {
            "risk_score": risk_score,
            "distress_score": distress_score,
            "positive_score": positive_score,
            "recent_incident_count": len(recent_incidents),
            "recent_record_count": len(recent_records),
            "previous_record_count": len(previous_records),
            "total_record_count": len(records),
        },
        "trends": {
            "stability": stability_direction,
            "emotional_distress": distress_direction,
            "risk_trajectory": risk_direction,
        },
        "signals": {
            "risk_level": risk_label,
            "triggers": triggers,
            "positive_anchors": anchors,
            "relationship_mentions": relationships,
        },
        "evidence_refs": evidence_refs,
        "recommendations": recommendations,
        "limitations": [
            "This is rule-based intelligence from visible records only.",
            "It should support, not replace, professional judgement.",
            "The young person's direct voice should be checked before drawing firm conclusions.",
        ],
    }