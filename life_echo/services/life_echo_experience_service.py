from __future__ import annotations

from life_echo.ai.reflective_narrator import LifeEchoReflectiveNarrator
from life_echo.atmosphere.atmosphere_engine import LifeEchoAtmosphereEngine
from life_echo.repositories.emotional_memory_repository import (
    emotional_memory_repository,
)
from life_echo.storage.memory_vault import LifeEchoMemoryVault


class LifeEchoExperienceService:
    """Builds unified frontend-ready LifeEcho experiences."""

    @staticmethod
    def build(child_id: str) -> dict:
        memories = [
            {
                "title": memory.title,
                "emotional_tone": memory.emotional_tone,
                "narrative": memory.narrative,
            }
            for memory in emotional_memory_repository.list_for_child(child_id)
        ]

        emotional_tone = (
            memories[-1]["emotional_tone"]
            if memories
            else "reflective"
        )

        atmosphere = LifeEchoAtmosphereEngine.resolve(
            emotional_tone=emotional_tone,
        )

        return {
            "child_id": child_id,
            "memory_count": len(memories),
            "memories": memories,
            "vault": LifeEchoMemoryVault.build(child_id),
            "atmosphere": atmosphere,
            "narration": LifeEchoReflectiveNarrator.build(
                child_name="Young Person",
                memories=memories,
            ),
        }


life_echo_experience_service = LifeEchoExperienceService()
