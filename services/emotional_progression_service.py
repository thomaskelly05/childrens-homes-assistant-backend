from __future__ import annotations

import re
from collections import Counter
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
        state_counts: Counter[str] = Counter()

        for record in ordered:
            text = _record_text(record)
            mood = self._mood(record, text)
            if mood:
                state_counts.update([mood])
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
            "what_improved": self._what_improved(sequence),
            "what_still_needs_support": self._what_still_needs_support(sequence, triggers),
            "support_that_helped": supports[-5:],
            "recurring_triggers": triggers[-5:],
            "recurring_emotional_themes": [
                {"state": state, "count": count}
                for state, count in state_counts.most_common()
                if count >= 2
            ],
            "wellbeing_continuity": self._wellbeing_continuity(sequence, supports, triggers),
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

    def _what_improved(self, sequence: list[dict[str, Any]]) -> str:
        if not sequence:
            return "No visible emotional progression has been recorded yet."
        states = [item["state"] for item in sequence]
        if any(state in {"settled", "positive"} for state in states[-3:]):
            return "Recent records include settled or positive presentation that staff can build on."
        return "Positive change is not yet clear in the visible emotional sequence."

    def _what_still_needs_support(self, sequence: list[dict[str, Any]], triggers: list[dict[str, Any]]) -> str:
        if not sequence:
            return "More daily notes are needed before support needs can be summarised."
        latest = sequence[-1]["state"]
        if latest in {"anxious", "heightened", "low"}:
            return f"Recent presentation is recorded as {latest}; continuity of support into the next shift may be helpful."
        if triggers:
            return "Recent trigger context is visible; the next shift should check whether the same pattern continues."
        return "No immediate emotional support theme is obvious from the visible sequence."

    def _wellbeing_continuity(
        self,
        sequence: list[dict[str, Any]],
        supports: list[dict[str, Any]],
        triggers: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return {
            "summary": self._what_changed(sequence),
            "latest_support_marker": supports[-1] if supports else None,
            "latest_trigger_marker": triggers[-1] if triggers else None,
            "next_shift_prompt": "What helped, what worried adults, and what should continue into the next shift?",
        }

    def _short(self, text: str) -> str:
        return " ".join(text.split())[:180]


emotional_progression_service = EmotionalProgressionService()
