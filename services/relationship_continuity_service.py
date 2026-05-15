from __future__ import annotations

import re
from collections import Counter
from typing import Any


RELATIONSHIP_PATTERNS = {
    "family": re.compile(r"\b(mum|mother|dad|father|aunt|uncle|sibling|brother|sister|family|contact)\b", re.I),
    "staff": re.compile(r"\b(staff|key worker|trusted adult|manager|support worker)\b", re.I),
    "professional": re.compile(r"\b(social worker|teacher|camhs|iro|advocate|police|virtual school)\b", re.I),
    "peer": re.compile(r"\b(peer|friend|young person|resident|classmate)\b", re.I),
}

POSITIVE_RELATIONSHIP_TERMS = re.compile(r"\b(repair|trusted|positive|settled|reassured|supported|agreed|joined|praised)\b", re.I)
TENSION_TERMS = re.compile(r"\b(argument|conflict|worry|concern|cancelled|raised voice|refused|missing|unsafe)\b", re.I)


def _field(record: dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in record:
            return record[name]
    return None


def _record_text(record: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("title", "summary", "narrative", "presentation", "description", "child_voice", "outcome"):
        value = record.get(key)
        if value:
            parts.append(str(value))
    for key in ("follow_up_actions", "actions", "relationships", "important_contacts"):
        value = record.get(key)
        if isinstance(value, list):
            parts.extend(str(item) for item in value)
    return " ".join(parts)


class RelationshipContinuityService:
    """Identifies relationship continuity markers without broadening child scope."""

    def markers(
        self,
        *,
        records: list[dict[str, Any]],
        young_person_id: int | str | None = None,
        home_id: int | str | None = None,
    ) -> dict[str, Any]:
        scoped = self._scope_records(records, young_person_id=young_person_id, home_id=home_id)
        category_counts: Counter[str] = Counter()
        tone_counts: Counter[str] = Counter()
        continuity_links: list[dict[str, Any]] = []
        repair_markers: list[dict[str, Any]] = []

        for record in scoped:
            text = _record_text(record)
            categories = [name for name, pattern in RELATIONSHIP_PATTERNS.items() if pattern.search(text)]
            if not categories:
                continue
            category_counts.update(categories)
            tone = self._tone(text)
            tone_counts.update([tone])
            marker = {
                "record_id": _field(record, "id", "record_id"),
                "title": _field(record, "title", "summary", "record_type") or "Relationship marker",
                "categories": categories,
                "tone": tone,
            }
            continuity_links.append(marker)
            if marker["tone"] == "repair_or_strength":
                repair_markers.append(marker)

        return {
            "markers": continuity_links[:8],
            "recurring_relationships": [
                {"category": category, "count": count}
                for category, count in category_counts.most_common()
                if count >= 2
            ],
            "repair_or_strength_markers": repair_markers[:5],
            "relationship_stability": self._stability(tone_counts),
            "supportive_relationships_visible": tone_counts.get("repair_or_strength", 0),
            "relationship_worry_markers": tone_counts.get("tension_or_worry", 0),
            "summary": self._summary(category_counts),
            "guardrail": "Relationship continuity is calculated only from scoped visible records.",
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

    def _tone(self, text: str) -> str:
        if POSITIVE_RELATIONSHIP_TERMS.search(text):
            return "repair_or_strength"
        if TENSION_TERMS.search(text):
            return "tension_or_worry"
        return "context"

    def _summary(self, counts: Counter[str]) -> str:
        if not counts:
            return "No visible relationship continuity markers yet."
        category, count = counts.most_common(1)[0]
        return f"{category.replace('_', ' ').title()} relationships appear in {count} scoped record(s)."

    def _stability(self, tone_counts: Counter[str]) -> dict[str, Any]:
        strengths = tone_counts.get("repair_or_strength", 0)
        worries = tone_counts.get("tension_or_worry", 0)
        if strengths and not worries:
            label = "stable_or_strengthening"
        elif strengths >= worries and strengths:
            label = "mixed_with_repair_visible"
        elif worries:
            label = "needs_continuity"
        else:
            label = "not_enough_visible_context"
        return {
            "label": label,
            "repair_or_strength_count": strengths,
            "tension_or_worry_count": worries,
            "prompt": "What should the next adult understand about trust, contact, repair or worry?",
        }


relationship_continuity_service = RelationshipContinuityService()
