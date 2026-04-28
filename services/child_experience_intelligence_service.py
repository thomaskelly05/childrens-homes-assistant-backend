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
# Turns visible young-person records into lived-experience intelligence.
#
# This is intentionally rule-based first so it is:
# - safer
# - explainable
# - inspectable
# - useful before AI narrative is layered on top
#
# It does not replace professional judgement.
# It supports staff, managers and leaders to notice patterns earlier.
# ============================================================


# ============================================================
# SIGNAL DICTIONARIES
# ============================================================

HIGH_RISK_TERMS = {
    "self harm",
    "self-harm",
    "self harmed",
    "cutting",
    "suicidal",
    "suicide",
    "wants to die",
    "kill myself",
    "ligature",
    "hanging",
    "missing",
    "missing from home",
    "abscond",
    "absconded",
    "exploitation",
    "cse",
    "criminal exploitation",
    "county lines",
    "violence",
    "assault",
    "physical aggression",
    "restraint",
    "police",
    "substance",
    "drugs",
    "alcohol",
    "overdose",
    "weapon",
    "knife",
    "threat",
    "unsafe",
    "harm to others",
    "sexualised behaviour",
}

EMOTIONAL_DISTRESS_TERMS = {
    "upset",
    "crying",
    "tearful",
    "distressed",
    "angry",
    "shouting",
    "screaming",
    "dysregulated",
    "anxious",
    "worried",
    "panic",
    "withdrawn",
    "refused",
    "refusal",
    "isolated",
    "low mood",
    "agitated",
    "overwhelmed",
    "frustrated",
    "heightened",
    "unsettled",
    "challenging behaviour",
    "difficulty regulating",
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
    "good day",
    "slept well",
    "attended school",
    "attended education",
    "enjoyed",
    "smiled",
    "laughing",
    "accepted support",
    "used coping strategy",
    "reflected",
    "apologised",
    "repaired",
}

TRIGGER_TERMS = {
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
    "change of plan",
    "food",
    "sleep",
    "noise",
    "sensory",
    "unknown adult",
    "social worker",
    "court",
    "therapy",
    "review",
}

RELATIONSHIP_TERMS = {
    "keyworker",
    "staff",
    "manager",
    "teacher",
    "social worker",
    "family",
    "mum",
    "mother",
    "dad",
    "father",
    "sibling",
    "brother",
    "sister",
    "friend",
    "peer",
    "carer",
}

SAFEGUARDING_TERMS = {
    "safeguarding",
    "strategy meeting",
    "referral",
    "lado",
    "mash",
    "police",
    "missing",
    "exploitation",
    "disclosure",
    "allegation",
    "risk of harm",
    "significant harm",
    "injury",
    "concern raised",
}

EDUCATION_TERMS = {
    "school",
    "education",
    "attendance",
    "lesson",
    "learning",
    "teacher",
    "college",
    "tutor",
    "exclusion",
    "refused school",
    "school refusal",
}

FAMILY_TERMS = {
    "family contact",
    "contact",
    "mum",
    "mother",
    "dad",
    "father",
    "sibling",
    "brother",
    "sister",
    "family visit",
}

VOICE_TERMS = {
    "said",
    "told staff",
    "shared",
    "explained",
    "reported",
    "stated",
    "asked",
    "wants",
    "does not want",
    "feels",
    "felt",
    "voice of child",
    "child voice",
}


RECORD_TYPE_WEIGHTS = {
    "incident": 3,
    "safeguarding": 4,
    "risk": 3,
    "missing": 4,
    "chronology": 2,
    "daily_note": 1,
    "keywork": 1,
    "family_contact": 2,
    "education": 1,
    "health": 1,
    "plan": 1,
    "review": 2,
    "record": 1,
}


# ============================================================
# SAFE HELPERS
# ============================================================

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
        return value.replace(tzinfo=None)

    if isinstance(value, datetime.date):
        return datetime.datetime.combine(value, datetime.time.min)

    text = _safe_string(value)
    if not text:
        return None

    cleaned = text.replace("Z", "+00:00")

    try:
        parsed = datetime.datetime.fromisoformat(cleaned)
        return parsed.replace(tzinfo=None)
    except Exception:
        pass

    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
    ):
        try:
            return datetime.datetime.strptime(text[:26], fmt)
        except Exception:
            continue

    return None


def _days_ago_from_date(date_value: datetime.datetime | None) -> int | None:
    if not date_value:
        return None

    now = datetime.datetime.utcnow()
    return max((now - date_value).days, 0)


def _contains_any(text: str, terms: set[str]) -> list[str]:
    lowered = text.lower()
    matches: list[str] = []

    for term in sorted(terms):
        if term in lowered:
            matches.append(term)

    return matches


def _word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def _normalise_record_type(value: str) -> str:
    raw = _safe_string(value).lower()

    aliases = {
        "daily_notes": "daily_note",
        "young_person_daily_notes": "daily_note",
        "incidents": "incident",
        "young_person_incidents": "incident",
        "safeguarding_record": "safeguarding",
        "safeguarding_records": "safeguarding",
        "young_person_safeguarding": "safeguarding",
        "keywork_session": "keywork",
        "keywork_sessions": "keywork",
        "family": "family_contact",
        "family_contacts": "family_contact",
        "risk_assessment": "risk",
        "risk_assessments": "risk",
        "young_person_risk": "risk",
        "young_people_chronology": "chronology",
        "young_person_chronology": "chronology",
    }

    return aliases.get(raw, raw or "record")


# ============================================================
# RECORD NORMALISATION
# ============================================================

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
        "concern_summary",
        "known_triggers",
        "early_warning_signs",
        "protective_factors",
        "response_plan",
        "session_summary",
        "contact_summary",
        "education_summary",
        "health_summary",
        "review_summary",
        "event_summary",
        "what_happened",
        "staff_response",
        "child_response",
        "next_steps",
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
        "communication_datetime",
        "note_date",
        "session_date",
        "contact_date",
        "review_date",
        "created_at",
        "updated_at",
        "date",
    ):
        parsed = _parse_date(record.get(key))
        if parsed:
            return parsed

    return None


def _record_type(record: dict[str, Any], fallback: str = "record") -> str:
    raw_type = _safe_string(
        record.get("record_type")
        or record.get("type")
        or record.get("bucket")
        or record.get("_source_context")
        or fallback
    )

    return _normalise_record_type(raw_type)


def _normalise_record(record: Any, fallback_type: str = "record") -> dict[str, Any] | None:
    if not isinstance(record, dict):
        return None

    text = _extract_text_from_record(record)
    date = _record_date(record)
    record_type = _record_type(record, fallback_type)

    if not text and not record.get("id") and not record.get("record_id"):
        return None

    return {
        "id": record.get("id") or record.get("record_id"),
        "type": record_type,
        "date": date,
        "date_label": date.isoformat() if date else None,
        "days_ago": _days_ago_from_date(date),
        "text": text,
        "word_count": _word_count(text),
        "source_table": record.get("_source_table"),
        "source_context": record.get("_source_context"),
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
        "family": "family_contact",
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


# ============================================================
# SCORING
# ============================================================

def _split_periods(
    records: list[dict[str, Any]],
    recent_days: int = 30,
    previous_days: int = 90,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    recent: list[dict[str, Any]] = []
    previous: list[dict[str, Any]] = []
    older_or_unknown: list[dict[str, Any]] = []

    for record in records:
        days = record.get("days_ago")

        if days is None:
            older_or_unknown.append(record)
            continue

        if days <= recent_days:
            recent.append(record)
        elif days <= previous_days:
            previous.append(record)
        else:
            older_or_unknown.append(record)

    return recent, previous, older_or_unknown


def _record_weight(record: dict[str, Any]) -> int:
    record_type = _normalise_record_type(_safe_string(record.get("type")))
    return RECORD_TYPE_WEIGHTS.get(record_type, 1)


def _weighted_term_hits(records: list[dict[str, Any]], terms: set[str]) -> int:
    total = 0

    for record in records:
        text = _lower_text(record.get("text"))
        matches = _contains_any(text, terms)
        if matches:
            total += len(matches) * _record_weight(record)

    return total


def _record_count_by_type(records: list[dict[str, Any]], record_types: set[str]) -> int:
    normalised_types = {_normalise_record_type(item) for item in record_types}

    return sum(
        1
        for record in records
        if _normalise_record_type(_safe_string(record.get("type"))) in normalised_types
    )


def _score_direction(
    *,
    recent_score: int,
    previous_score: int,
    lower_is_better: bool,
) -> str:
    if recent_score == 0 and previous_score == 0:
        return "stable"

    difference = recent_score - previous_score

    if abs(difference) <= 1:
        return "stable"

    if lower_is_better:
        return "improving" if recent_score < previous_score else "declining"

    return "improving" if recent_score > previous_score else "declining"


def _risk_level(score: int) -> str:
    if score >= 24:
        return "critical"
    if score >= 14:
        return "high"
    if score >= 6:
        return "medium"
    return "low"


def _experience_status(
    *,
    risk_score: int,
    distress_score: int,
    positive_score: int,
    recent_incident_count: int,
    safeguarding_score: int,
) -> str:
    if risk_score >= 24 or safeguarding_score >= 16:
        return "escalating"

    if recent_incident_count >= 5 or risk_score >= 14:
        return "heightened"

    if distress_score >= 14 and distress_score > positive_score:
        return "declining"

    if positive_score >= distress_score + 4 and risk_score <= 5:
        return "strengthening"

    return "stable"


# ============================================================
# SIGNAL EXTRACTION
# ============================================================

def _extract_counter(records: list[dict[str, Any]], terms: set[str]) -> Counter[str]:
    counter: Counter[str] = Counter()

    for record in records:
        text = _lower_text(record.get("text"))
        for match in _contains_any(text, terms):
            counter[match] += _record_weight(record)

    return counter


def _top_counter_items(counter: Counter[str], limit: int = 6) -> list[dict[str, Any]]:
    return [
        {"label": label, "count": count}
        for label, count in counter.most_common(limit)
    ]


def _build_record_refs(
    records: list[dict[str, Any]],
    terms: set[str],
    limit: int = 8,
) -> list[dict[str, Any]]:
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
                "source_table": record.get("source_table"),
                "date": record.get("date_label"),
                "matches": matches[:6],
                "excerpt": _safe_string(record.get("text"))[:260],
            }
        )

        if len(refs) >= limit:
            break

    return refs


def _build_child_voice_refs(records: list[dict[str, Any]], limit: int = 6) -> list[dict[str, Any]]:
    refs: list[dict[str, Any]] = []

    for record in records:
        text = _safe_string(record.get("text"))
        lowered = text.lower()

        if not _contains_any(lowered, VOICE_TERMS):
            continue

        refs.append(
            {
                "id": record.get("id"),
                "type": record.get("type"),
                "date": record.get("date_label"),
                "excerpt": text[:260],
            }
        )

        if len(refs) >= limit:
            break

    return refs


# ============================================================
# NARRATIVE / RECOMMENDATIONS
# ============================================================

def _plain_status_label(status: str) -> str:
    labels = {
        "escalating": "escalating",
        "heightened": "heightened",
        "declining": "showing signs of decline",
        "strengthening": "showing signs of strengthening",
        "stable": "broadly stable",
    }

    return labels.get(status, status)


def _build_summary(
    *,
    records_count: int,
    recent_count: int,
    previous_count: int,
    status: str,
    risk_label: str,
    stability_direction: str,
    distress_direction: str,
    risk_direction: str,
    top_triggers: list[dict[str, Any]],
    top_anchors: list[dict[str, Any]],
) -> str:
    trigger_text = (
        ", ".join(item["label"] for item in top_triggers[:3])
        if top_triggers
        else "no repeated trigger clearly visible"
    )

    anchor_text = (
        ", ".join(item["label"] for item in top_anchors[:3])
        if top_anchors
        else "no repeated positive anchor clearly visible"
    )

    return (
        f"Child Experience Intelligence reviewed {records_count} visible records "
        f"({recent_count} recent and {previous_count} previous comparison records). "
        f"The current lived-experience picture appears {_plain_status_label(status)}, "
        f"with a {risk_label} risk signal. Stability is {stability_direction}, "
        f"emotional distress is {distress_direction}, and risk trajectory is {risk_direction}. "
        f"The most visible trigger pattern is: {trigger_text}. "
        f"The most visible positive anchor pattern is: {anchor_text}."
    )


def _build_recommendations(
    *,
    status: str,
    risk_level: str,
    triggers: list[dict[str, Any]],
    anchors: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    child_voice_refs: list[dict[str, Any]],
    recent_incident_count: int,
) -> list[str]:
    recommendations: list[str] = []

    if status in {"escalating", "heightened"} or risk_level in {"high", "critical"}:
        recommendations.append(
            "Manager should review recent incidents, safeguarding records and risk assessments to decide whether a strategy review, escalation or updated risk plan is required."
        )

    if recent_incident_count >= 3:
        recommendations.append(
            "Consider a short management review of the last 7–30 days to identify whether incidents are clustering around a time, person, routine or known trigger."
        )

    if triggers:
        trigger_labels = ", ".join(item["label"] for item in triggers[:3])
        recommendations.append(
            f"Check whether proactive planning is in place before the most visible triggers occur: {trigger_labels}."
        )

    if anchors:
        anchor_labels = ", ".join(item["label"] for item in anchors[:3])
        recommendations.append(
            f"Protect and repeat the positive anchors linked with stability or engagement: {anchor_labels}."
        )

    if relationships:
        relationship_labels = ", ".join(item["label"] for item in relationships[:3])
        recommendations.append(
            f"Review relationship patterns involving {relationship_labels}; consider whether particular adults, peers or family links are helping or increasing pressure."
        )

    if not child_voice_refs:
        recommendations.append(
            "The young person’s direct voice is not strongly visible in the analysed records. Staff should check whether their wishes, feelings and lived experience have been captured clearly."
        )
    else:
        recommendations.append(
            "Use the young person’s recorded voice alongside this pattern analysis before making planning decisions."
        )

    recommendations.append(
        "Use this as an evidence prompt for professional reflection. Confirm findings against direct records, staff knowledge, safeguarding judgement and the young person’s own views."
    )

    return recommendations


def _build_ofsted_lens(
    *,
    status: str,
    risk_level: str,
    triggers: list[dict[str, Any]],
    anchors: list[dict[str, Any]],
    child_voice_refs: list[dict[str, Any]],
) -> dict[str, Any]:
    strengths: list[str] = []
    concerns: list[str] = []
    inspection_questions: list[str] = []

    if anchors:
        strengths.append(
            "There are visible positive anchors that may evidence what helps the young person feel safer, more settled or more engaged."
        )

    if child_voice_refs:
        strengths.append(
            "Some direct or indirect child voice appears visible in the records."
        )
    else:
        concerns.append(
            "The child’s voice is not strongly visible in the analysed evidence."
        )

    if status in {"escalating", "heightened", "declining"} or risk_level in {"high", "critical"}:
        concerns.append(
            "Recent records may suggest increased vulnerability, emotional pressure or safeguarding concern that should be reviewed by managers."
        )

    if triggers:
        inspection_questions.append(
            "Can staff explain the young person’s key triggers and show how plans reduce predictable distress?"
        )

    inspection_questions.append(
        "Can the home evidence that the young person’s day-to-day experience is improving, not just that records are completed?"
    )

    inspection_questions.append(
        "Can managers show how patterns across incidents, daily life, education, family contact and keywork inform planning?"
    )

    return {
        "strengths": strengths,
        "concerns": concerns,
        "inspection_questions": inspection_questions,
    }


# ============================================================
# PUBLIC BUILDER
# ============================================================

def build_child_experience_intelligence(
    *,
    young_person_id: int,
    context: dict[str, Any],
) -> dict[str, Any]:
    records = _collect_records(context)
    recent_records, previous_records, older_or_unknown_records = _split_periods(records)

    recent_risk_hits = _weighted_term_hits(recent_records, HIGH_RISK_TERMS)
    previous_risk_hits = _weighted_term_hits(previous_records, HIGH_RISK_TERMS)

    recent_distress_hits = _weighted_term_hits(recent_records, EMOTIONAL_DISTRESS_TERMS)
    previous_distress_hits = _weighted_term_hits(previous_records, EMOTIONAL_DISTRESS_TERMS)

    recent_positive_hits = _weighted_term_hits(recent_records, POSITIVE_TERMS)
    previous_positive_hits = _weighted_term_hits(previous_records, POSITIVE_TERMS)

    safeguarding_hits = _weighted_term_hits(recent_records, SAFEGUARDING_TERMS)
    education_hits = _weighted_term_hits(recent_records, EDUCATION_TERMS)
    family_hits = _weighted_term_hits(recent_records, FAMILY_TERMS)

    recent_incident_count = _record_count_by_type(
        recent_records,
        {"incident", "safeguarding", "missing"},
    )

    trigger_counter = _extract_counter(recent_records, TRIGGER_TERMS)
    anchor_counter = _extract_counter(recent_records, POSITIVE_TERMS)
    relationship_counter = _extract_counter(recent_records, RELATIONSHIP_TERMS)

    risk_score = recent_risk_hits + safeguarding_hits + (recent_incident_count * 3)
    distress_score = recent_distress_hits
    positive_score = recent_positive_hits

    risk_label = _risk_level(risk_score)

    status = _experience_status(
        risk_score=risk_score,
        distress_score=distress_score,
        positive_score=positive_score,
        recent_incident_count=recent_incident_count,
        safeguarding_score=safeguarding_hits,
    )

    stability_direction = _score_direction(
        recent_score=positive_score,
        previous_score=previous_positive_hits,
        lower_is_better=False,
    )

    distress_direction = _score_direction(
        recent_score=distress_score,
        previous_score=previous_distress_hits,
        lower_is_better=True,
    )

    risk_direction = _score_direction(
        recent_score=recent_risk_hits,
        previous_score=previous_risk_hits,
        lower_is_better=True,
    )

    triggers = _top_counter_items(trigger_counter)
    anchors = _top_counter_items(anchor_counter)
    relationships = _top_counter_items(relationship_counter)

    child_voice_refs = _build_child_voice_refs(recent_records)

    evidence_refs = {
        "risk": _build_record_refs(recent_records, HIGH_RISK_TERMS),
        "distress": _build_record_refs(recent_records, EMOTIONAL_DISTRESS_TERMS),
        "positive": _build_record_refs(recent_records, POSITIVE_TERMS),
        "triggers": _build_record_refs(recent_records, TRIGGER_TERMS),
        "safeguarding": _build_record_refs(recent_records, SAFEGUARDING_TERMS),
        "child_voice": child_voice_refs,
    }

    recommendations = _build_recommendations(
        status=status,
        risk_level=risk_label,
        triggers=triggers,
        anchors=anchors,
        relationships=relationships,
        child_voice_refs=child_voice_refs,
        recent_incident_count=recent_incident_count,
    )

    ofsted_lens = _build_ofsted_lens(
        status=status,
        risk_level=risk_label,
        triggers=triggers,
        anchors=anchors,
        child_voice_refs=child_voice_refs,
    )

    summary = _build_summary(
        records_count=len(records),
        recent_count=len(recent_records),
        previous_count=len(previous_records),
        status=status,
        risk_label=risk_label,
        stability_direction=stability_direction,
        distress_direction=distress_direction,
        risk_direction=risk_direction,
        top_triggers=triggers,
        top_anchors=anchors,
    )

    return {
        "young_person_id": young_person_id,
        "status": status,
        "summary": summary,
        "scores": {
            "risk_score": risk_score,
            "distress_score": distress_score,
            "positive_score": positive_score,
            "safeguarding_score": safeguarding_hits,
            "education_signal_score": education_hits,
            "family_signal_score": family_hits,
            "recent_incident_count": recent_incident_count,
            "recent_record_count": len(recent_records),
            "previous_record_count": len(previous_records),
            "older_or_unknown_record_count": len(older_or_unknown_records),
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
            "child_voice_visible": bool(child_voice_refs),
        },
        "ofsted_lens": ofsted_lens,
        "evidence_refs": evidence_refs,
        "recommendations": recommendations,
        "limitations": [
            "This is rule-based intelligence from visible records only.",
            "It should support, not replace, professional judgement.",
            "A low score does not mean there is no risk; it may mean risk is not visible in the available records.",
            "The young person’s direct voice should be checked before drawing firm conclusions.",
            "Managers should verify patterns against original records, chronology and staff knowledge.",
        ],
    }