from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoSensoryContextEngine:
    """Builds sensory continuity context from emotional memories."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        sensory_counter = Counter()
        location_counter = Counter()

        for event in events:
            sensory_counter.update(event.tags)

            if event.location:
                location_counter.update([event.location])

        return {
            "sensory_themes": [
                {
                    "theme": theme,
                    "count": count,
                }
                for theme, count in sensory_counter.most_common(8)
            ],
            "important_places": [
                {
                    "location": location,
                    "count": count,
                }
                for location, count in location_counter.most_common(5)
            ],
        }
