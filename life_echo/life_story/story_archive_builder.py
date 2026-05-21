from __future__ import annotations

from datetime import datetime, timezone


class LifeEchoStoryArchiveBuilder:
    """Creates structured emotional archive payloads for long-term continuity."""

    @staticmethod
    def build(*, child_id: str, chapters: list[dict]) -> dict:
        return {
            "child_id": child_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "archive_type": "life_story_archive",
            "chapter_count": len(chapters),
            "chapters": chapters,
        }
