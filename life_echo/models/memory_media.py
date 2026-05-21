from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class MemoryMedia:
    id: str
    child_id: str
    title: str
    media_type: str
    storage_url: str
    created_at: datetime
    description: str | None = None
    tags: list[str] = field(default_factory=list)
