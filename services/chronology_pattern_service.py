from __future__ import annotations

from collections import Counter
from typing import Any


class ChronologyPatternService:
    """Detects chronology patterns from operational intelligence events."""

    def analyse(self, events: list[dict[str, Any]]) -> dict[str, Any]:
        incidents = [event for event in events if event.get("source_table") == "incidents"]
        missing = [event for event in events if "missing" in (event.get("risk_tags") or []) or event.get("source_table") == "missing_episodes"]
        dysregulated = [event for event in events if "dysregulated" in (event.get("emotional_tags") or [])]
        safeguarding = [event for event in events if event.get("safeguarding")]

        escalation_before_incidents = self._escalation_before(incidents, events)
        escalation_before_missing = self._escalation_before(missing, events)
        emotional_triggers = self._emotional_triggers(events)
        relationship_themes = self._relationship_themes(events)
        placement_instability = self._placement_instability(events, safeguarding)
        repeat_safeguarding = self._repeat_themes(safeguarding, "safeguarding")
        repeat_dysregulation = self._repeat_themes(dysregulated, "dysregulation")

        orb_questions = self._orb_questions(
            escalation_before_incidents=escalation_before_incidents,
            escalation_before_missing=escalation_before_missing,
            repeat_dysregulation=repeat_dysregulation,
        )

        return {
            "ok": True,
            "escalation_before_incidents": escalation_before_incidents,
            "escalation_before_missing_episodes": escalation_before_missing,
            "emotional_triggers": emotional_triggers,
            "repeated_relationship_themes": relationship_themes,
            "placement_instability": placement_instability,
            "repeat_safeguarding_themes": repeat_safeguarding,
            "repeat_dysregulation_cycles": repeat_dysregulation,
            "orb_questions": orb_questions,
            "summary": self._summary(escalation_before_incidents, escalation_before_missing, repeat_dysregulation),
        }

    def _escalation_before(self, targets: list[dict[str, Any]], events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not targets:
            return []
        patterns: list[dict[str, Any]] = []
        pressure_tags = {"anxious", "distressed", "dysregulated", "withdrawn"}
        for target in targets[:5]:
            prior = [
                event
                for event in events
                if str(event.get("event_at") or "") < str(target.get("event_at") or "")
                and set(event.get("emotional_tags") or []) & pressure_tags
            ]
            if prior:
                patterns.append({
                    "target_event_id": target.get("event_id"),
                    "prior_pressure_events": len(prior),
                    "themes": Counter(tag for event in prior for tag in event.get("emotional_tags") or []).most_common(3),
                    "message": "Emotional pressure indicators appeared before this significant event.",
                })
        return patterns

    def _emotional_triggers(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter()
        for event in events:
            counter.update(event.get("emotional_tags") or [])
        return [{"trigger": tag, "count": count} for tag, count in counter.most_common(8)]

    def _relationship_themes(self, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        counter: Counter[str] = Counter()
        for event in events:
            counter.update(event.get("relationship_tags") or [])
        return [{"theme": tag, "count": count} for tag, count in counter.most_common(8) if count >= 2]

    def _placement_instability(self, events: list[dict[str, Any]], safeguarding: list[dict[str, Any]]) -> dict[str, Any]:
        pressure = len(safeguarding) + sum(1 for event in events if "missing" in (event.get("risk_tags") or []))
        state = "unstable" if pressure >= 4 else "watching" if pressure >= 2 else "stable"
        return {"state": state, "pressure_score": pressure}

    def _repeat_themes(self, events: list[dict[str, Any]], label: str) -> list[str]:
        if len(events) < 2:
            return []
        return [f"Repeated {label} themes detected across {len(events)} recent operational event(s)."]

    def _orb_questions(
        self,
        *,
        escalation_before_incidents: list[dict[str, Any]],
        escalation_before_missing: list[dict[str, Any]],
        repeat_dysregulation: list[str],
    ) -> dict[str, str]:
        questions = {
            "patterns_before_incidents": (
                "What patterns exist before incidents?"
                if escalation_before_incidents
                else "No clear pre-incident escalation pattern was detected in the supplied events."
            ),
            "patterns_before_missing": (
                "What happens before missing episodes?"
                if escalation_before_missing
                else "No clear pre-missing escalation pattern was detected in the supplied events."
            ),
            "interventions_reduce_dysregulation": (
                "What interventions reduce dysregulation?"
                if repeat_dysregulation
                else "Insufficient dysregulation repetition to suggest intervention review from supplied events."
            ),
        }
        return questions

    def _summary(
        self,
        escalation_before_incidents: list[dict[str, Any]],
        escalation_before_missing: list[dict[str, Any]],
        repeat_dysregulation: list[str],
    ) -> str:
        parts = []
        if escalation_before_incidents:
            parts.append(f"{len(escalation_before_incidents)} pre-incident escalation pattern(s)")
        if escalation_before_missing:
            parts.append(f"{len(escalation_before_missing)} pre-missing pattern(s)")
        if repeat_dysregulation:
            parts.append("repeated dysregulation cycles")
        if not parts:
            return "No significant chronology patterns were detected from the supplied operational events."
        return "Chronology intelligence identified: " + ", ".join(parts) + "."


chronology_pattern_service = ChronologyPatternService()
