from __future__ import annotations

from life_echo.child_memory import LifeEchoChildMemoryBuilder
from life_echo.schemas import LifeEchoEvent


class LifeEchoMobileMemoryFeed:
    """Builds mobile-friendly emotional memory feeds for young people."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        memories = LifeEchoChildMemoryBuilder.build(events)

        return {
            "feed_type": "mobile_memory_feed",
            "cards": memories,
            "empty_message": (
                "Positive memories and achievements will appear here over time."
            ),
        }
