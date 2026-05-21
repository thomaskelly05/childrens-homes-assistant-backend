from __future__ import annotations

from life_echo.child_memory import LifeEchoChildMemoryBuilder
from life_echo.schemas import LifeEchoEvent


class LifeEchoLifeStoryExport:
    """Builds child-centred life story export structures."""

    @staticmethod
    def export(events: list[LifeEchoEvent]) -> dict:
        memories = LifeEchoChildMemoryBuilder.build(events)

        return {
            "title": "Life Story Timeline",
            "memory_count": len(memories),
            "timeline": memories,
            "generated_by": "LifeEcho",
        }
