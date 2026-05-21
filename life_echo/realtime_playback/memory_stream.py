from __future__ import annotations

from datetime import datetime, timezone


class LifeEchoMemoryStream:
    """Streams emotional memory events into realtime playback experiences."""

    @staticmethod
    def build_event(*, child_id: str, event_type: str, payload: dict) -> dict:
        return {
            "child_id": child_id,
            "event_type": event_type,
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
