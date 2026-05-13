from __future__ import annotations

import asyncio
import time
from collections import defaultdict

from fastapi import WebSocket


class AssistantRealtimeGuard:
    def __init__(self) -> None:
        self.connection_attempts: dict[str, list[float]] = defaultdict(list)
        self.active_connections: dict[str, int] = defaultdict(int)
        self.max_attempts_per_minute = 30
        self.max_connections_per_ip = 5
        self.lock = asyncio.Lock()

    async def allow(self, websocket: WebSocket) -> bool:
        client = websocket.client.host if websocket.client else 'unknown'

        async with self.lock:
            now = time.time()
            window_start = now - 60

            self.connection_attempts[client] = [
                attempt
                for attempt in self.connection_attempts[client]
                if attempt > window_start
            ]

            if len(self.connection_attempts[client]) >= self.max_attempts_per_minute:
                return False

            if self.active_connections[client] >= self.max_connections_per_ip:
                return False

            self.connection_attempts[client].append(now)
            self.active_connections[client] += 1

            return True

    async def disconnect(self, websocket: WebSocket) -> None:
        client = websocket.client.host if websocket.client else 'unknown'

        async with self.lock:
            self.active_connections[client] = max(
                0,
                self.active_connections[client] - 1,
            )


assistant_realtime_guard = AssistantRealtimeGuard()
