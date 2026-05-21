from __future__ import annotations

from life_echo.models.emotional_memory import EmotionalMemory


class EmotionalMemoryRepository:
    """Temporary in-memory repository until PostgreSQL persistence is connected."""

    def __init__(self) -> None:
        self._items: list[EmotionalMemory] = []

    def save(self, memory: EmotionalMemory) -> EmotionalMemory:
        self._items.append(memory)
        return memory

    def list_for_child(self, child_id: str) -> list[EmotionalMemory]:
        return [
            item for item in self._items if item.child_id == child_id
        ]


emotional_memory_repository = EmotionalMemoryRepository()
