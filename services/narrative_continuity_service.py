from __future__ import annotations

import re
from collections import Counter
from typing import Any

from services.emotional_progression_service import emotional_progression_service
from services.relationship_continuity_service import relationship_continuity_service


THEME_PATTERNS = {
    "safeguarding": re.compile(r"\b(safeguarding|missing|police|strategy|risk|harm|unsafe|exploitation|disclos)\b", re.I),
    "education": re.compile(r"\b(school|education|teacher|homework|virtual school|timetable|attendance)\b", re.I),
    "wellbeing": re.compile(r"\b(wellbeing|mood|sleep|anxious|settled|heightened|withdrawn|emotional)\b", re.I),
    "routine": re.compile(r"\b(routine|morning|evening|meal|sleep|hygiene|bedtime|woke)\b", re.I),
    "relationships": re.compile(r"\b(family|contact|staff|key worker|social worker|friend|peer|relationship)\b", re.I),
    "progress": re.compile(r"\b(progress|achiev|improved|settled|positive|enjoyed|joined|confident|praised)\b", re.I),
}
UNRESOLVED_TERMS = re.compile(r"\b(unresolved|ongoing|follow[- ]?up|review|required|concern|worry|monitor|open|overdue|next)\b", re.I)
CHILD_VOICE_TERMS = re.compile(r"\b(child said|young person said|said|told staff|wishes|feelings|preferred|voice|choice)\b", re.I)
STRENGTH_TERMS = re.compile(r"\b(strength|proud|managed|enjoyed|trusted|repaired|settled|regulated|joined|achiev|confident)\b", re.I)
ADULT_WORRY_TERMS = re.compile(r"\b(worry|concern|unsafe|risk|heightened|withdrawn|missing|police|strategy|injur|self[- ]?harm)\b", re.I)


def _field(record: dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in record:
            return record[name]
    return None


def _record_text(record: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in (
        "title",
        "summary",
        "narrative",
        "presentation",
        "description",
        "child_voice",
        "wishes_feelings",
        "outcome",
        "actions_required",
        "staff_support",
    ):
        value = record.get(key)
        if value:
            parts.append(str(value))
    for key in ("follow_up_actions", "actions", "tags"):
        value = record.get(key)
        if isinstance(value, list):
            parts.extend(str(item) for item in value)
    return " ".join(parts)


class NarrativeContinuityService:
    """Turns scoped records into child-centred continuity, not broad database recall."""

    def summarise(
        self,
        *,
        records: list[dict[str, Any]],
        child: dict[str, Any] | None = None,
        young_person_id: int | str | None = None,
        home_id: int | str | None = None,
    ) -> dict[str, Any]:
        scoped = self._scope_records(records, young_person_id=young_person_id, home_id=home_id)
        ordered = sorted(scoped, key=lambda item: str(_field(item, "created_at", "createdAt", "event_date", "date", "dateTime") or ""), reverse=True)
        theme_counts: Counter[str] = Counter()
        unresolved: list[dict[str, Any]] = []
        unresolved_emotional: list[dict[str, Any]] = []
        progress: list[dict[str, Any]] = []
        strengths: list[dict[str, Any]] = []
        worries: list[dict[str, Any]] = []
        child_voice: list[dict[str, Any]] = []

        for record in ordered:
            text = _record_text(record)
            themes = [theme for theme, pattern in THEME_PATTERNS.items() if pattern.search(text)]
            theme_counts.update(themes)
            citation = self._citation(record, themes)
            if UNRESOLVED_TERMS.search(text) or str(record.get("status", "")).lower() in {"open", "overdue", "review", "in_progress"}:
                unresolved.append({**citation, "reason": "Visible record still contains follow-up, review or concern language."})
                if "wellbeing" in themes or ADULT_WORRY_TERMS.search(text):
                    unresolved_emotional.append({**citation, "reason": "Visible record links an unresolved action or concern to emotional wellbeing."})
            if "progress" in themes:
                progress.append({**citation, "reason": "Visible record contains strength or progress language."})
            if STRENGTH_TERMS.search(text):
                strengths.append({**citation, "reason": "Visible record names a strength, repair, regulation or positive step."})
            if ADULT_WORRY_TERMS.search(text):
                worries.append({**citation, "reason": "Visible record contains worry, risk or heightened presentation language."})
            if CHILD_VOICE_TERMS.search(text):
                child_voice.append({**citation, "reason": "Visible record includes words, wishes, feelings or choices."})

        relationship = relationship_continuity_service.markers(records=scoped, young_person_id=young_person_id, home_id=home_id)
        emotional = emotional_progression_service.progression(records=scoped, young_person_id=young_person_id, home_id=home_id)
        child_name = (child or {}).get("preferred_name") or (child or {}).get("preferredName") or (child or {}).get("name") or "This child"

        return {
            "child_id": young_person_id,
            "record_count": len(scoped),
            "what_changed": self._what_changed(ordered),
            "what_helped": self._what_helped(ordered),
            "what_still_needs_support": self._what_still_needs_support(unresolved),
            "support_effectiveness": self._support_effectiveness(ordered),
            "unresolved_themes": unresolved[:6],
            "unresolved_emotional_themes": unresolved_emotional[:5],
            "recurring_themes": [
                {"theme": theme, "count": count}
                for theme, count in theme_counts.most_common()
                if count >= 2
            ],
            "recurring_strengths": strengths[:5],
            "positive_progress": progress[:5],
            "emotional_wellbeing": emotional,
            "wellbeing_continuity": emotional.get("wellbeing_continuity"),
            "placement_journey": self._placement_journey(child=child, records=ordered),
            "relationship_continuity": relationship,
            "child_voice_continuity": child_voice[:5],
            "what_worried_adults": worries[:5],
            "what_next_shift_should_understand": self._next_shift_understanding(child_name, ordered, unresolved, strengths, worries),
            "today_mattered_because": self._today_mattered(child_name, ordered, unresolved, progress),
            "guardrails": [
                "Only scoped visible records are used.",
                "Narrative continuity highlights themes and gaps; staff remain responsible for judgement.",
                "No cross-child records are included in summaries or citations.",
            ],
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

    def _citation(self, record: dict[str, Any], themes: list[str]) -> dict[str, Any]:
        return {
            "record_id": _field(record, "id", "record_id"),
            "record_type": _field(record, "record_type", "recordType", "category") or "record",
            "title": _field(record, "title", "summary") or "Source record",
            "date": _field(record, "created_at", "createdAt", "event_date", "date", "dateTime"),
            "themes": themes,
        }

    def _what_changed(self, records: list[dict[str, Any]]) -> str:
        if not records:
            return "No visible chronology has been recorded yet."
        latest = records[0]
        return str(_field(latest, "summary", "presentation", "title") or "The latest visible record should be reviewed for change.")

    def _what_helped(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        helped = []
        for record in records:
            text = _record_text(record).lower()
            if any(term in text for term in ("helped", "supported", "reassured", "listened", "space", "keywork", "routine")):
                helped.append({**self._citation(record, []), "reason": "Visible record names support that may have helped."})
        return helped[:5]

    def _what_still_needs_support(self, unresolved: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {**item, "language": "follow-up appears incomplete; continuity into the next shift may be helpful."}
            for item in unresolved[:5]
        ]

    def _support_effectiveness(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        helpful = self._what_helped(records)
        progress = [
            record for record in records
            if any(term in _record_text(record).lower() for term in ("settled", "repaired", "regulated", "calmer", "positive", "progress"))
        ]
        return {
            "visible_support_markers": helpful,
            "positive_change_markers": [self._citation(record, []) for record in progress[:5]],
            "summary": "Support effectiveness is described only where visible records link support to change.",
            "what_helped_prompt": "Name the support, the child's response, and whether it should continue.",
        }

    def _placement_journey(self, *, child: dict[str, Any] | None, records: list[dict[str, Any]]) -> dict[str, Any]:
        child = child or {}
        placement = child.get("placement_status") or child.get("placementStatus") or child.get("status")
        goals = child.get("placement_goals") or child.get("placementGoals") or []
        return {
            "status": placement or "not_recorded",
            "goals": goals[:5] if isinstance(goals, list) else [],
            "recent_records": [self._citation(record, []) for record in records[:3]],
        }

    def _today_mattered(
        self,
        child_name: str,
        records: list[dict[str, Any]],
        unresolved: list[dict[str, Any]],
        progress: list[dict[str, Any]],
    ) -> str:
        if progress:
            return f"Today mattered because {child_name}'s visible record includes progress or a strength staff can build on."
        if unresolved:
            return f"Today mattered because {child_name} has follow-up or worry themes that need continuity into the next shift."
        if records:
            return f"Today mattered because it adds context to {child_name}'s lived experience."
        return "Today has not yet been written into the child's journey."

    def _next_shift_understanding(
        self,
        child_name: str,
        records: list[dict[str, Any]],
        unresolved: list[dict[str, Any]],
        strengths: list[dict[str, Any]],
        worries: list[dict[str, Any]],
    ) -> str:
        if unresolved:
            return f"The next shift should understand what remains open for {child_name}, who owns it, and what would show it has improved."
        if worries and strengths:
            return f"The next shift should hold both what worried adults and what helped {child_name} settle or repair."
        if strengths:
            return f"The next shift should build on the strengths or settled moments visible for {child_name}."
        if records:
            return f"The next shift should read the latest record before adding new actions for {child_name}."
        return "The next shift has no visible story continuity yet."


narrative_continuity_service = NarrativeContinuityService()
