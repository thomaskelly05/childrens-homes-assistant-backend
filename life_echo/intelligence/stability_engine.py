from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoStabilityEngine:
    """Measures consistency and stability indicators across the timeline."""

    @staticmethod
    def analyse(events: list[LifeEchoEvent]) -> dict:
        if not events:
            return {
                "stability": "unknown",
                "summary": "No continuity information available yet.",
            }

        staff_counter = Counter()
        trigger_counter = Counter()

        for event in events:
            staff_counter.update(event.staff_ids)
            trigger_counter.update(event.triggers)

        recurring_staff = len([count for count in staff_counter.values() if count >= 3])
        recurring_triggers = len(
            [count for count in trigger_counter.values() if count >= 3]
        )

        if recurring_staff >= 2 and recurring_triggers <= 1:
            stability = "stable"
        elif recurring_triggers >= 3:
            stability = "unstable"
        else:
            stability = "developing"

        return {
            "stability": stability,
            "consistent_staff_relationships": recurring_staff,
            "recurring_triggers": recurring_triggers,
            "summary": (
                f"Placement and emotional continuity currently appear {stability}."
            ),
        }
