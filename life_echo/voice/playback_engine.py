from __future__ import annotations

from life_echo.voice.memory_voice_store import life_echo_memory_voice_store


class LifeEchoVoicePlaybackEngine:
    """Builds frontend playback structures for emotional voice memories."""

    @staticmethod
    def build(child_id: str) -> dict:
        memories = life_echo_memory_voice_store.list_memories(child_id)

        return {
            "mode": "voice_playback",
            "tracks": [
                {
                    "id": memory["id"],
                    "title": memory["title"],
                    "speaker": memory["speaker"],
                    "transcript": memory["transcript"],
                    "created_at": memory["created_at"],
                }
                for memory in memories
            ],
        }
