from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone


class LifeEchoRealtimeSessionManager:
    """Tracks connected realtime LifeEcho dashboard sessions."""

    def __init__(self) -> None:
        self._sessions: dict[str, list[dict]] = defaultdict(list)

    def connect(self, child_id: str, session_id: str) -> dict:
        session = {
            "session_id": session_id,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "status": "connected",
        }

        self._sessions[child_id].append(session)
        return session

    def disconnect(self, child_id: str, session_id: str) -> None:
        self._sessions[child_id] = [
            session
            for session in self._sessions.get(child_id, [])
            if session["session_id"] != session_id
        ]

    def active_sessions(self, child_id: str) -> list[dict]:
        return self._sessions.get(child_id, [])


life_echo_realtime_sessions = LifeEchoRealtimeSessionManager()
