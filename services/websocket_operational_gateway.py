from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from auth.rbac import has_permission, normalise_role
from auth.websocket_auth import (
    decode_websocket_session_payload,
    resolve_websocket_session_token,
    websocket_session_is_revoked,
)
from services.operational_metrics_service import operational_metrics_service
from services.realtime_event_bus import realtime_event_bus
from services.realtime_operational_stream_service import realtime_operational_stream_service
from services.realtime_recovery_service import realtime_recovery_service


def _home_id(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _young_person_id(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


class WebSocketOperationalGateway:
    """Auth-aware operational websocket for Care Hub live intelligence."""

    def __init__(self) -> None:
        self.heartbeat_seconds = int(os.getenv("OS_WEBSOCKET_HEARTBEAT_SECONDS", "20"))
        self.poll_fallback_seconds = int(os.getenv("OS_WEBSOCKET_POLL_FALLBACK_SECONDS", "30"))
        self.max_messages_per_window = int(os.getenv("OS_WEBSOCKET_RATE_LIMIT", "80"))

    def websocket_user(self, websocket: WebSocket) -> dict[str, Any] | None:
        token = resolve_websocket_session_token(websocket)
        payload = decode_websocket_session_payload(token) if token else None
        if not payload:
            return None
        if websocket_session_is_revoked(payload):
            return None
        role = normalise_role(payload.get("role"))
        permissions = set(payload.get("permissions") or [])
        if not (has_permission(role, "realtime:subscribe") or "realtime:subscribe" in permissions):
            if not (has_permission(role, "assistant:access") or "assistant:access" in permissions):
                return None
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": role,
            "home_id": payload.get("home_id"),
            "provider_id": payload.get("provider_id"),
            "permissions": list(permissions),
            "allowed_home_ids": payload.get("allowed_home_ids") or payload.get("home_ids") or [],
        }

    def _validate_scope(
        self,
        *,
        current_user: dict[str, Any],
        home_id: int | None,
        young_person_id: int | None,
    ) -> dict[str, Any]:
        if home_id is None:
            home_id = _home_id(current_user.get("home_id") or current_user.get("selected_home_id"))
        if home_id is None:
            raise PermissionError("Operational websocket requires home scope")
        if not realtime_event_bus.can_access_home(current_user, home_id):
            raise PermissionError("Home scope denied for operational websocket")
        return {"home_id": home_id, "young_person_id": young_person_id, "provider_id": current_user.get("provider_id")}

    async def handle(self, websocket: WebSocket, *, conn: Any) -> None:
        current_user = self.websocket_user(websocket)
        if not current_user:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Operational stream requires authenticated session with realtime:subscribe"})
            await websocket.close(code=1008)
            return

        home_id = _home_id(websocket.query_params.get("home_id") or current_user.get("home_id"))
        young_person_id = _young_person_id(
            websocket.query_params.get("young_person_id") or websocket.query_params.get("selected_young_person_id")
        )
        after_cursor = websocket.query_params.get("after_cursor")
        try:
            cursor = int(after_cursor) if after_cursor not in (None, "") else None
        except ValueError:
            cursor = None

        try:
            scope = self._validate_scope(current_user=current_user, home_id=home_id, young_person_id=young_person_id)
        except PermissionError as exc:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": str(exc)})
            await websocket.close(code=1008)
            return

        await websocket.accept()
        socket_id = f"os_ws_{uuid.uuid4().hex[:16]}"
        operational_metrics_service.increment("websocket.operational_connect", dimensions={"home_id": scope["home_id"]})

        if cursor is not None:
            replay = realtime_event_bus.replay_for_user(
                current_user=current_user,
                home_id=scope["home_id"],
                after_cursor=cursor,
            )
            await websocket.send_json({"type": "operational.replay", "replay": replay})

        snapshot = realtime_operational_stream_service.build_stream_snapshot(
            conn,
            current_user=current_user,
            young_person_id=scope.get("young_person_id"),
            home_id=scope["home_id"],
        )
        await websocket.send_json(
            {
                "type": "operational.stream.ready",
                "socket_id": socket_id,
                "scope": scope,
                "snapshot": snapshot,
                "poll_fallback_seconds": self.poll_fallback_seconds,
            }
        )

        limiter: list[float] = []
        heartbeat = asyncio.create_task(self._heartbeat(websocket, scope))
        try:
            while True:
                raw = await websocket.receive_text()
                if self._rate_limited(limiter):
                    await websocket.send_json({"type": "error", "message": "Operational websocket rate limit exceeded"})
                    continue
                message = self._parse_message(raw)
                msg_type = message.get("type")

                if msg_type == "pong":
                    continue
                if msg_type == "reconnect":
                    plan = realtime_recovery_service.reconnect(
                        session_id=str(message.get("session_id") or socket_id),
                        attempts=int(message.get("attempts") or 1),
                        last_sequence=message.get("last_cursor"),
                        home_id=scope["home_id"],
                    )
                    replay = realtime_event_bus.replay_for_user(
                        current_user=current_user,
                        home_id=scope["home_id"],
                        after_cursor=message.get("last_cursor"),
                    )
                    await websocket.send_json({"type": "operational.reconnect", "plan": plan, "replay": replay})
                    continue
                if msg_type == "subscribe":
                    events = realtime_event_bus.recent_events_for_user(
                        current_user=current_user,
                        home_id=scope["home_id"],
                        limit=int(message.get("limit") or 20),
                    )
                    await websocket.send_json({"type": "operational.events.snapshot", "events": events})
                    continue
                if msg_type == "refresh":
                    fresh = realtime_operational_stream_service.build_stream_snapshot(
                        conn,
                        current_user=current_user,
                        young_person_id=scope.get("young_person_id"),
                        home_id=scope["home_id"],
                    )
                    await websocket.send_json({"type": "operational.stream.update", "snapshot": fresh})
                    continue
                await websocket.send_json({"type": "operational.ack", "received_type": msg_type})
        except WebSocketDisconnect:
            operational_metrics_service.increment("websocket.operational_disconnect", dimensions={"home_id": scope["home_id"]})
        finally:
            heartbeat.cancel()

    async def _heartbeat(self, websocket: WebSocket, scope: dict[str, Any]) -> None:
        while True:
            await asyncio.sleep(self.heartbeat_seconds)
            try:
                await websocket.send_json(
                    {
                        "type": "ping",
                        "home_id": scope.get("home_id"),
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
            except Exception:
                return

    def _parse_message(self, raw: str) -> dict[str, Any]:
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {"type": "unknown"}
        except Exception:
            return {"type": "unknown"}

    def _rate_limited(self, bucket: list[float]) -> bool:
        now = asyncio.get_event_loop().time()
        bucket[:] = [seen for seen in bucket if now - seen < 10]
        if len(bucket) >= self.max_messages_per_window:
            return True
        bucket.append(now)
        return False


websocket_operational_gateway = WebSocketOperationalGateway()
