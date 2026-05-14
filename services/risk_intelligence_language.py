from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any


SAFE_DECISION_SUPPORT_NOTICE = (
    "Decision support only. Records indicate patterns for adult review; professional judgement and source-record checks remain required."
)

SAFE_OUTPUT_PREFIXES = (
    "records indicate",
    "pattern suggests",
    "consider checking",
    "review recommended",
    "evidence found",
    "no evidence found",
    "possible indicator",
)

UNSAFE_LANGUAGE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bthis child will\b", re.I), "records indicate this child may"),
    (re.compile(r"\babuse is happening\b", re.I), "review recommended for safeguarding evidence"),
    (re.compile(r"\bthis is definitely exploitation\b", re.I), "possible indicator of exploitation; review recommended"),
    (re.compile(r"\bthe child is unsafe because\b", re.I), "records indicate a review is needed because"),
    (re.compile(r"\bhigh risk area\b", re.I), "location requiring review"),
    (re.compile(r"\bcriminal behaviour confirmed\b", re.I), "possible indicator requiring professional review"),
    (re.compile(r"\bconfirmed exploitation\b", re.I), "possible indicator of exploitation"),
    (re.compile(r"\bdangerous area\b", re.I), "location requiring review"),
    (re.compile(r"\bunsafe child\b", re.I), "child requiring supportive review"),
    (re.compile(r"\bwill\b", re.I), "may"),
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def field(record: dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in record:
            return record[name]
    return None


def safe_text(value: Any) -> str:
    text = str(value or "").strip()
    for pattern, replacement in UNSAFE_LANGUAGE_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def safe_payload(value: Any) -> Any:
    if isinstance(value, str):
        return safe_text(value)
    if isinstance(value, list):
        return [safe_payload(item) for item in value]
    if isinstance(value, tuple):
        return tuple(safe_payload(item) for item in value)
    if isinstance(value, dict):
        return {key: safe_payload(item) for key, item in value.items()}
    return value


def record_text(record: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in (
        "title",
        "summary",
        "description",
        "presentation",
        "trigger",
        "outcome",
        "actionTaken",
        "action_taken",
        "managerReview",
        "manager_review",
        "youngPersonVoice",
        "young_person_voice",
        "location",
        "route",
        "notes",
    ):
        value = record.get(key)
        if value:
            parts.append(str(value))
    for key in ("followUpActions", "follow_up_actions", "actions", "tags", "controlMeasures", "control_measures"):
        value = record.get(key)
        if isinstance(value, list):
            parts.extend(str(item) for item in value)
    return " ".join(parts)


def record_date(record: dict[str, Any]) -> str | None:
    value = field(record, "created_at", "createdAt", "event_date", "date", "dateTime", "updated_at", "reviewDate")
    return str(value) if value else None


def citation(record: dict[str, Any], *, reason: str | None = None) -> dict[str, Any]:
    payload = {
        "record_id": field(record, "id", "record_id", "source_record_id") or "record",
        "record_type": field(record, "record_type", "recordType", "type", "category") or "record",
        "title": field(record, "title", "summary", "description", "type", "category") or "Source record",
        "date": record_date(record),
    }
    if reason:
        payload["reason"] = safe_text(reason)
    return safe_payload(payload)


def scope_records(
    records: list[dict[str, Any]],
    *,
    young_person_id: int | str | None = None,
    home_id: int | str | None = None,
    active_child_only: bool = True,
) -> list[dict[str, Any]]:
    scoped: list[dict[str, Any]] = []
    for record in records:
        if record.get("hidden"):
            continue
        record_child = field(record, "young_person_id", "youngPersonId", "child_id", "childId")
        record_home = field(record, "home_id", "homeId")
        if young_person_id is not None and record_child is not None and str(record_child) != str(young_person_id):
            continue
        if active_child_only and young_person_id is not None and record_child is None:
            continue
        if home_id is not None and record_home is not None and str(record_home) != str(home_id):
            continue
        scoped.append(record)
    return scoped


def evidence_gap(gap_id: str, prompt: str) -> dict[str, str]:
    return {"gap_id": gap_id, "summary": safe_text(prompt), "language": "no evidence found"}


def review_prompt(prompt_id: str, prompt: str, *, priority: str = "review") -> dict[str, str]:
    return {
        "prompt_id": prompt_id,
        "priority": priority,
        "prompt": safe_text(prompt),
        "language": "review recommended",
    }


def contains_unsafe_language(value: Any) -> list[str]:
    text = str(value)
    found: list[str] = []
    checks = [
        r"\bthis child will\b",
        r"\babuse is happening\b",
        r"\bthis is definitely exploitation\b",
        r"\bthe child is unsafe because\b",
        r"\bhigh risk area\b",
        r"\bcriminal behaviour confirmed\b",
        r"\bconfirmed exploitation\b",
        r"\bdangerous area\b",
        r"\bunsafe child\b",
        r"\bwill\b",
    ]
    for pattern in checks:
        if re.search(pattern, text, re.I):
            found.append(pattern)
    return found
