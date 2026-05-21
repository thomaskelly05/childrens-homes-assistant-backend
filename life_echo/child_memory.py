from __future__ import annotations

from life_echo.schemas import LifeEchoEvent, LifeEchoVisibility


class LifeEchoChildMemoryBuilder:
    """Builds child-safe memory timelines from LifeEcho events."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> list[dict]:
        child_safe_events = [
            event
            for event in events
            if event.visibility == LifeEchoVisibility.child_memory
        ]

        memories: list[dict] = []

        for event in child_safe_events:
            memories.append(
                {
                    "title": event.title,
                    "moment": event.narrative,
                    "date": event.occurred_at.isoformat(),
                    "emotion": event.emotional_tone.value,
                    "child_voice": event.child_voice,
                    "tags": event.tags,
                }
            )

        return memories
