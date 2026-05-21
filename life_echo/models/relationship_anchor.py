from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class RelationshipAnchor:
    id: str
    child_id: str
    display_name: str
    connection_type: str
    created_at: datetime
    active: bool = True
