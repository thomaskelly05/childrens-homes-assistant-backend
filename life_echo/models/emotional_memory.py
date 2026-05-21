from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class EmotionalMemory:
    id: str
    child_id: str
    title: str
    narrative: str
    emotional_tone: str
    created_at: datetime
    atmosphere: str | None = None
    sensory_tags: list[str] = field(default_factory=list)
    media_ids: list[str] = field(default_factory=list)
    relationship_ids: list[str] = field(default_factory=list)
    voice_memory_ids: list[str] = field(default_factory=list)
