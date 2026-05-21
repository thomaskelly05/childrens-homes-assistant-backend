from __future__ import annotations

from life_echo.child_memory import LifeEchoChildMemoryBuilder
from life_echo.schemas import LifeEchoEvent


class LifeEchoChildMemoryModeBuilder:
    """Builds child-safe frontend memory journey experiences."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        memories = LifeEchoChildMemoryBuilder.build(events)

        return {
            "mode": "child_memory",
            "timeline": memories,
            "message": (
                "This space is designed to help young people reflect on positive "
                "memories, growth and important moments."
            ),
        }
