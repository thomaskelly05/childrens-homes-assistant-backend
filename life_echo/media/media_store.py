from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


class LifeEchoMediaStore:
    """Stores metadata for memory box photos, videos, artwork and documents."""

    def __init__(self) -> None:
        self._media: list[dict] = []

    def add_media(
        self,
        *,
        child_id: str,
        title: str,
        media_type: str,
        url: str,
        description: str | None = None,
        tags: list[str] | None = None,
    ) -> dict:
        item = {
            "id": f"media_{uuid4().hex}",
            "child_id": child_id,
            "title": title,
            "media_type": media_type,
            "url": url,
            "description": description,
            "tags": tags or [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._media.append(item)
        return item

    def list_media(self, child_id: str) -> list[dict]:
        return [item for item in self._media if item["child_id"] == child_id]


life_echo_media_store = LifeEchoMediaStore()
