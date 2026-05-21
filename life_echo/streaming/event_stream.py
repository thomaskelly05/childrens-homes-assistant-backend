from __future__ import annotations

from collections import deque


class LifeEchoEventStream:
    """Realtime event stream for frontend emotional intelligence updates."""

    def __init__(self, max_size: int = 1000) -> None:
        self._stream: deque[dict] = deque(maxlen=max_size)

    def publish(self, payload: dict) -> None:
        self._stream.append(payload)

    def latest(self, limit: int = 50) -> list[dict]:
        return list(self._stream)[-limit:]


life_echo_event_stream = LifeEchoEventStream()
