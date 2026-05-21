from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class EmotionalPeriod:
    id: str
    child_id: str
    title: str
    atmosphere: str
    started_at: datetime
    ended_at: datetime | None = None
    themes: list[str] = field(default_factory=list)
    reflective_summary: str | None = None
