from __future__ import annotations

import re
from typing import Any


EMOTIONAL_TERMS = {
    "settled": re.compile(r"\b(settled|calm|regulated|relaxed|reassured)\b", re.I),
    "positive": re.compile(r"\b(positive|proud|enjoyed|achiev|joined|laughed|confident)\b", re.I),
    "anxious": re.compile(r"\b(anxious|worried|fearful|uncertain|overwhelmed)\b", re.I),
    "heightened": re.compile(r"\b(heightened|angry|distressed|shouting|agitated|escalat)\b", re.I),
    "low": re.compile(r"\b(low mood|withdrawn|sad|tearful|isolated|quiet)\b", re.I),
}
SUPPORT_TERMS = re.compile(r"\b(supported|reassured|space|choice|keywork|routine|debrief|repair|restorative|prompt)\b", re.I)
TRIGGER_TERMS = re.compile(r"\b(trigger|because|after|cancelled|unexpected|contact|school|routine|refused|missing)\b", re.I)


def _field(record: dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in record:
            return record[name]
    return None


def _record_text(record: dict[str, Any]) -> str:
    parts = [
        str(record.get(key) or "")
        for key in ("mood", "summary", "narrative", "presentation", "description", "trigger", "outcome", "staff_support")
    ]
    value = record.get("follow_up_actions") or record.get("actions")
    if isinstance(value, list):
        parts.extend(str(item) for item in value)
    return " ".join(part for part in parts if part)


class EmotionalProgressionService:
    """Builds a cautious emotional progression from visible scoped records."""

    def progression(
        self,
        *,
        records: list[dict[str, Any]],
        young_person_id: int | str | None = None,
        home_id: int | str | None = None,
    ) -> dict[str, Any]:
        scoped = self._scope_records(records, young_person_id=young_person_id, home_id=home_id)
        ordered = sorted(scoped, key=lambda item: str(_field(item, "created_at", "createdAt", "event_date", "date", "dateTime") or ""))
        sequence: list[dict[str, Any]] = []
        supports: list[dict[str, Any]] = []
        triggers: list[dict[str, Any]] = []

        for record in ordered:
            text = _record_text(record)
            mood = self._mood(record, text)
            if mood:
                sequence.append({
                    "record_id": _field(record, "id", "record_id"),
                    "date": _field(record, "created_at", "createdAt", "event_date", "date", "dateTime"),
                    "state": mood,
                    "summary": _field(record, "summary", "presentation", "title") or mood,
                })
            if SUPPORT_TERMS.search(text):
                supports.append({"record_id": _field(record, "id", "record_id"), "support": self._short(text)})
            if TRIGGER_TERMS.search(text):
                triggers.append({"record_id": _field(record, "id", "record_id"), "context": self._short(text)})

        return {
            "sequence": sequence[-8:],
            "current_state": sequence[-1]["state"] if sequence else "not_recorded",
            "what_changed": self._what_changed(sequence),
            "support_that_helped": supports[-5:],
            "recurring_triggers": triggers[-5:],
            "guardrail": "Emotional progression describes presentation in records; it is not a diagnosis.",
        }

    def _scope_records(
        self,
        records: list[dict[str, Any]],
        *,
        young_person_id: int | str | None,
        home_id: int | str | None,
    ) -> list[dict[str, Any]]:
        scoped: list[dict[str, Any]] = []
        for record in records:
            if record.get("hidden"):
                continue
            record_child = _field(record, "young_person_id", "youngPersonId", "child_id", "childId")
            record_home = _field(record, "home_id", "homeId")
            if young_person_id is not None and record_child is not None and str(record_child) != str(young_person_id):
                continue
            if home_id is not None and record_home is not None and str(record_home) != str(home_id):
                continue
            scoped.append(record)
        return scoped

    def _mood(self, record: dict[str, Any], text: str) -> str | None:
        explicit = str(record.get("mood") or "").strip().lower()
        if explicit:
            return explicit
        for mood, pattern in EMOTIONAL_TERMS.items():
            if pattern.search(text):
                return mood
        return None

    def _what_changed(self, sequence: list[dict[str, Any]]) -> str:
        if len(sequence) < 2:
            return "More daily notes are needed before a progression can be described."
        first = sequence[0]["state"]
        latest = sequence[-1]["state"]
        if first == latest:
            return f"Presentation remains recorded as {latest} across the visible sequence."
        return f"Presentation moved from {first} to {latest} in the visible records."

    def _short(self, text: str) -> str:
        return " ".join(text.split())[:180]


emotional_progression_service = EmotionalProgressionService()
