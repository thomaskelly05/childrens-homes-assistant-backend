from __future__ import annotations

from collections import defaultdict
from typing import Callable


class LifeEchoEventBus:
    """Lightweight internal event bus for LifeEcho orchestration."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event_name: str, handler: Callable) -> None:
        self._subscribers[event_name].append(handler)

    def publish(self, event_name: str, payload: dict) -> None:
        for handler in self._subscribers.get(event_name, []):
            handler(payload)


life_echo_event_bus = LifeEchoEventBus()
