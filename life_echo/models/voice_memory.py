from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class VoiceMemory:
    id: str
    child_id: str
    title: str
    speaker: str
    transcript: str
    audio_url: str | None
    created_at: datetime
    emotional_tone: str | None = None
    waveform: list[float] = field(default_factory=list)
