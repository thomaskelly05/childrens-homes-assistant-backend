from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


class LifeEchoPrivateReflections:
    """Stores child-safe private emotional reflections."""

    def __init__(self) -> None:
        self._entries: list[dict] = []

    def create(
        self,
        *,
        child_id: str,
        title: str,
        content: str,
        emotional_tone: str,
    ) -> dict:
        reflection = {
            "id": f"reflection_{uuid4().hex}",
            "child_id": child_id,
            "title": title,
            "content": content,
            "emotional_tone": emotional_tone,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "private": True,
        }

        self._entries.append(reflection)
        return reflection

    def list_for_child(self, child_id: str) -> list[dict]:
        return [
            entry for entry in self._entries if entry["child_id"] == child_id
        ]


life_echo_private_reflections = LifeEchoPrivateReflections()
