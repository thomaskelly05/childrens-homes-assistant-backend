from __future__ import annotations

from datetime import datetime, timezone

from life_echo.narrative_memory.story_engine import (
    LifeEchoNarrativeStoryEngine,
)
from life_echo.storage.memory_vault import LifeEchoMemoryVault


class LifeEchoLifeStoryExportEngine:
    """Builds portable emotional continuity exports."""

    @staticmethod
    def build(child_id: str, events: list) -> dict:
        narrative = LifeEchoNarrativeStoryEngine.build(events)
        vault = LifeEchoMemoryVault.build(child_id)

        return {
            "child_id": child_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "title": "LifeEcho Life Story Export",
            "narrative": narrative,
            "vault": vault,
            "sections": [
                "Emotional Journey",
                "Memories",
                "Relationships",
                "Achievements",
                "Voice Reflections",
                "Protective Factors",
            ],
        }
