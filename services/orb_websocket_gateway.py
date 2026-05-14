from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, WebSocket, WebSocketDisconnect, status

from auth.routes import settings as auth_settings
from auth.rbac import has_permission, normalise_role
from auth.tokens import decode_session_token
from services.audit_event_service import record_audit_event
from services.orb_observability_service import orb_observability_service, worker_id
from services.orb_session_store import orb_session_store
from services.realtime_event_bus import realtime_event_bus
from services.session_security_service import is_session_revoked


def _user_id(current_user: dict[str, Any]) -> int | None:
    try:
        value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
        return int(value) if value is not None else None
    except Exception:
        return None


def _home_id(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _child_scope(value: Any) -> int | None:
    try:
        return int(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Orb websocket child scope is invalid.")


class OrbWebSocketGateway:
    """Authentication, binding and lifecycle management for Orb sockets."""

    def __init__(self) -> None:
        self.heartbeat_seconds = int(os.getenv("ORB_WEBSOCKET_HEARTBEAT_SECONDS", "25"))
        self.reconnect_grace_seconds = int(os.getenv("ORB_RECONNECT_GRACE_SECONDS", "45"))
        self.max_messages_per_window = int(os.getenv("ORB_WEBSOCKET_RATE_LIMIT", "60"))

    def websocket_user(self, websocket: WebSocket) -> dict[str, Any] | None:
        token = (websocket.cookies.get(auth_settings.session_cookie_name) or "").strip()
        if not token:
            auth = websocket.headers.get("authorization") or ""
            if auth.lower().startswith("bearer "):
                token = auth[7:].strip()
        if not token:
            token = (websocket.query_params.get("token") or "").strip()
        payload = decode_session_token(token) if token else None
        if not payload:
            return None
        session_id = payload.get("sid")
        if session_id and is_session_revoked(str(session_id)):
            return None
        role = normalise_role(payload.get("role"))
        permissions = set(payload.get("permissions") or [])
        if not (has_permission(role, "assistant:access") or "assistant:access" in permissions):
            return None
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": role,
            "home_id": payload.get("home_id"),
            "provider_id": payload.get("provider_id"),
            "allowed_home_ids": payload.get("allowed_home_ids") or payload.get("home_ids") or [],
        }

    def validate_session_access(
        self,
        *,
        session_id: str,
        current_user: dict[str, Any],
        requested_home_id: int | str | None = None,
        assistant_scope: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        from services.orb_voice_session_service import orb_voice_session_service

        session = orb_voice_session_service.get_session_for_user(session_id, current_user)
        session_home_id = _home_id(session.context.home_id)
        requested = _home_id(requested_home_id) or _home_id((assistant_scope or {}).get("home_id"))
        if requested is not None and session_home_id is not None and requested != session_home_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Orb websocket home scope mismatch.")
        if session_home_id is not None and not realtime_event_bus.can_access_home(current_user, session_home_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Orb websocket home scope denied.")
        selected_child = _child_scope((assistant_scope or {}).get("selected_young_person_id"))
        session_child = _child_scope(session.context.selected_young_person_id)
        if selected_child is not None and session_child is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Orb websocket child scope is not bound to the session.")
        if selected_child is not None and session_child is not None and selected_child != session_child:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Orb websocket child scope mismatch.")
        return {
            "session_id": session.id,
            "user_id": session.user_id,
            "home_id": session_home_id,
            "state": session.state,
        }

    async def handle(self, websocket: WebSocket) -> None:
        current_user = self.websocket_user(websocket)
        if not current_user:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Orb realtime requires an authenticated assistant session"})
            await websocket.close(code=1008)
            return

        session_id = str(websocket.query_params.get("session_id") or "")
        if not session_id:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Missing Orb session_id"})
            await websocket.close(code=1008)
            return

        try:
            binding_scope = self.validate_session_access(
                session_id=session_id,
                current_user=current_user,
                requested_home_id=websocket.query_params.get("home_id"),
                assistant_scope={
                    "selected_young_person_id": websocket.query_params.get("selected_young_person_id")
                    or websocket.query_params.get("young_person_id")
                },
            )
        except HTTPException as exc:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": exc.detail})
            await websocket.close(code=1008)
            return

        await websocket.accept()
        socket_id = f"orb_ws_{uuid.uuid4().hex[:16]}"
        duplicate_socket_ids = orb_session_store.cleanup_socket_bindings(session_id=session_id)
        orb_session_store.bind_socket(
            session_id=session_id,
            socket_id=socket_id,
            user_id=_user_id(current_user),
            home_id=binding_scope.get("home_id"),
            worker_id=worker_id(),
        )
        orb_observability_service.record_event(
            "websocket_connect",
            session_id=session_id,
            user_id=_user_id(current_user),
            home_id=binding_scope.get("home_id"),
            metadata={"duplicate_sockets_removed": len(duplicate_socket_ids)},
        )
        record_audit_event(
            event_type="orb.realtime_ws",
            action="connect",
            actor=current_user,
            resource_type="orb_session",
            resource_id=session_id,
            metadata={"raw_audio_stored": False, "worker_id": worker_id(), "duplicate_sockets_removed": len(duplicate_socket_ids)},
        )

        limiter: list[float] = []
        heartbeat = asyncio.create_task(self._heartbeat(websocket, session_id))
        try:
            await websocket.send_json({"type": "orb.websocket.ready", "session_id": session_id, "socket_id": socket_id})
            while True:
                raw = await websocket.receive_text()
                if self._rate_limited(limiter):
                    await websocket.send_json({"type": "error", "message": "Orb realtime message rate limit exceeded"})
                    continue
                message = self._parse_message(raw)
                if message.get("type") == "pong":
                    continue
                if message.get("type") == "subscribe":
                    self.validate_session_access(
                        session_id=session_id,
                        current_user=current_user,
                        requested_home_id=message.get("home_id"),
                        assistant_scope=message.get("assistant_scope") if isinstance(message.get("assistant_scope"), dict) else None,
                    )
                    events = realtime_event_bus.recent_events_for_user(
                        current_user=current_user,
                        home_id=binding_scope.get("home_id"),
                        limit=10,
                    )
                    await websocket.send_json({"type": "orb.events.snapshot", "events": events})
                    continue
                await websocket.send_json({"type": "orb.websocket.ack", "received_type": message.get("type")})
        except WebSocketDisconnect:
            orb_observability_service.record_websocket_disconnect(session_id=session_id, reason="client_disconnect")
        except Exception as exc:
            orb_observability_service.record_websocket_disconnect(session_id=session_id, reason=exc.__class__.__name__)
            try:
                await websocket.send_json({"type": "error", "message": "Orb realtime connection closed safely"})
            except Exception:
                pass
        finally:
            heartbeat.cancel()
            orb_session_store.unbind_socket(session_id=session_id, socket_id=socket_id)
            record_audit_event(
                event_type="orb.realtime_ws",
                action="disconnect",
                actor=current_user,
                resource_type="orb_session",
                resource_id=session_id,
                metadata={"raw_audio_stored": False, "worker_id": worker_id()},
            )

    async def _heartbeat(self, websocket: WebSocket, session_id: str) -> None:
        while True:
            await asyncio.sleep(self.heartbeat_seconds)
            try:
                await websocket.send_json({"type": "ping", "session_id": session_id, "sent_at": datetime.now(timezone.utc).isoformat()})
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


orb_websocket_gateway = OrbWebSocketGateway()
