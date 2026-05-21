from __future__ import annotations

from collections import defaultdict


class LifeEchoWebsocketGateway:
    """Tracks active realtime LifeEcho websocket channels."""

    def __init__(self) -> None:
        self._channels: dict[str, list[str]] = defaultdict(list)

    def connect(self, child_id: str, connection_id: str) -> dict:
        self._channels[child_id].append(connection_id)

        return {
            "child_id": child_id,
            "connection_id": connection_id,
            "status": "connected",
        }

    def disconnect(self, child_id: str, connection_id: str) -> None:
        self._channels[child_id] = [
            item
            for item in self._channels.get(child_id, [])
            if item != connection_id
        ]

    def active_connections(self, child_id: str) -> list[str]:
        return self._channels.get(child_id, [])


life_echo_websocket_gateway = LifeEchoWebsocketGateway()
