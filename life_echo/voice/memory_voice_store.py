from __future__ import annotations

from datetime import datetime, timezone


class LifeEchoMemoryVoiceStore:
    """Stores emotional voice memories and affirmations."""

    def __init__(self) -> None:
        self._voice_memories: list[dict] = []

    def store(
        self,
        *,
        child_id: str,
        title: str,
        transcript: str,
        speaker: str,
    ) -> dict:
        memory = {
            "id": f"voice_{len(self._voice_memories) + 1}",
            "child_id": child_id,
            "title": title,
            "transcript": transcript,
            "speaker": speaker,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        self._voice_memories.append(memory)
        return memory

    def list_memories(self, child_id: str) -> list[dict]:
        return [
            memory
            for memory in self._voice_memories
            if memory["child_id"] == child_id
        ]


life_echo_memory_voice_store = LifeEchoMemoryVoiceStore()
