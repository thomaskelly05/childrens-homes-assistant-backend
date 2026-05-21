from __future__ import annotations

from collections import deque


class LifeEchoEventQueue:
    """Simple in-memory runtime queue for LifeEcho processing."""

    def __init__(self) -> None:
        self._queue: deque[dict] = deque()

    def enqueue(self, payload: dict) -> None:
        self._queue.append(payload)

    def dequeue(self) -> dict | None:
        if not self._queue:
            return None
        return self._queue.popleft()

    def size(self) -> int:
        return len(self._queue)


life_echo_event_queue = LifeEchoEventQueue()
