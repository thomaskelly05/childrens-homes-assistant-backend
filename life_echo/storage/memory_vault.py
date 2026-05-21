from __future__ import annotations

from life_echo.media.media_store import life_echo_media_store
from life_echo.memory_capsules.service import life_echo_memory_capsules
from life_echo.voice.memory_voice_store import life_echo_memory_voice_store


class LifeEchoMemoryVault:
    """Unified emotional memory vault for LifeEcho experiences."""

    @staticmethod
    def build(child_id: str) -> dict:
        return {
            "child_id": child_id,
            "media": life_echo_media_store.list_media(child_id),
            "voice_memories": (
                life_echo_memory_voice_store.list_memories(child_id)
            ),
            "memory_capsules": (
                life_echo_memory_capsules.available_capsules(child_id)
            ),
            "vault_message": (
                "This vault preserves emotionally important memories, "
                "relationships, achievements and reflections."
            ),
        }
