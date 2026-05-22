from __future__ import annotations

from collections import Counter
from typing import Any

from services.operational_projection_engine import operational_projection_engine


class OrbOperationalMemoryService:
    def build_memory(self, events: list[dict[str, Any]], *, young_person_id: int | None = None) -> dict[str, Any]:
        projection = operational_projection_engine.project(
            events,
            subject_type="young_person" if young_person_id else "home",
            subject_id=str(young_person_id) if young_person_id else None,
        )

        emotional_counter: Counter[str] = Counter()
        risk_counter: Counter[str] = Counter()
        relationship_counter: Counter[str] = Counter()

        for event in events:
            emotional_counter.update(event.get("emotional_tags") or [])
            risk_counter.update(event.get("risk_tags") or [])
            relationship_counter.update(event.get("relationship_tags") or [])

        recurring_patterns = self._patterns(events)

        memory_summary = {
            "overview": projection.orb_memory_summary,
            "emotional_patterns": emotional_counter.most_common(8),
            "risk_patterns": risk_counter.most_common(8),
            "relationship_patterns": relationship_counter.most_common(8),
            "recurring_patterns": recurring_patterns,
            "manager_attention": projection.manager_attention,
            "placement_stability": projection.placement_stability,
            "safeguarding_escalation": projection.safeguarding_escalation,
        }

        conversational_summary = self._conversation(memory_summary)

        return {
            "projection": projection.model_dump(),
            "memory_summary": memory_summary,
            "conversation_summary": conversational_summary,
        }

    def _patterns(self, events: list[dict[str, Any]]) -> list[str]:
        patterns: list[str] = []

        safeguarding_events = [event for event in events if event.get("safeguarding")]
        if len(safeguarding_events) >= 3:
            patterns.append("Repeated safeguarding-linked events detected across recent records.")

        dysregulated = sum(
            1
            for event in events
            if "dysregulated" in (event.get("emotional_tags") or [])
        )
        if dysregulated >= 2:
            patterns.append("Repeated emotional dysregulation themes are emerging.")

        family_related = sum(
            1
            for event in events
            if "family" in (event.get("relationship_tags") or [])
        )
        if family_related >= 2:
            patterns.append("Family-related events appear repeatedly within recent operational records.")

        missing_related = sum(
            1
            for event in events
            if "missing" in (event.get("risk_tags") or [])
        )
        if missing_related >= 2:
            patterns.append("Missing-from-home indicators appear repeatedly and may require contextual safeguarding review.")

        return patterns

    def _conversation(self, memory_summary: dict[str, Any]) -> str:
        lines = [memory_summary["overview"]]

        if memory_summary["recurring_patterns"]:
            lines.append("Recurring patterns identified:")
            lines.extend(f"- {item}" for item in memory_summary["recurring_patterns"][:5])

        if memory_summary["manager_attention"]:
            lines.append("Management attention areas:")
            lines.extend(f"- {item}" for item in memory_summary["manager_attention"][:5])

        emotional = memory_summary["emotional_patterns"]
        if emotional:
            top = ", ".join(f"{tag} ({count})" for tag, count in emotional[:5])
            lines.append(f"Most common emotional indicators: {top}.")

        risks = memory_summary["risk_patterns"]
        if risks:
            top = ", ".join(f"{tag} ({count})" for tag, count in risks[:5])
            lines.append(f"Most common safeguarding/risk indicators: {top}.")

        return "\n".join(lines)


orb_operational_memory_service = OrbOperationalMemoryService()
