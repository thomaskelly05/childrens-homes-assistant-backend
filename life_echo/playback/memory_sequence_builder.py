from __future__ import annotations

from collections import defaultdict

from life_echo.schemas import LifeEchoEvent


class LifeEchoMemorySequenceBuilder:
    """Groups emotional memories into meaningful journey chapters."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        grouped = defaultdict(list)

        for event in sorted(events, key=lambda item: item.occurred_at):
            chapter = event.occurred_at.strftime("%B %Y")
            grouped[chapter].append(
                {
                    "id": event.id,
                    "title": event.title,
                    "emotion": event.emotional_tone.value,
                    "summary": event.narrative,
                }
            )

        return {
            "chapters": [
                {
                    "title": chapter,
                    "memories": memories,
                }
                for chapter, memories in grouped.items()
            ]
        }
