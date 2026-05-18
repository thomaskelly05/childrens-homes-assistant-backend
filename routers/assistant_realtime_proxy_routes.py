from __future__ import annotations

import asyncio
import json
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

from auth.routes import settings as auth_settings
from auth.rbac import has_permission, normalise_role
from auth.tokens import decode_session_token
from middleware.assistant_realtime_guard import assistant_realtime_guard
from services.audit_event_service import record_audit_event
from services.session_security_service import is_session_revoked

router = APIRouter(prefix="/assistant/realtime", tags=["Assistant Realtime Proxy"])

OPENAI_REALTIME_URL = os.getenv(
    "OPENAI_REALTIME_URL",
    "wss://api.openai.com/v1/realtime?model=gpt-realtime"
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def _websocket_user(websocket: WebSocket) -> dict | None:
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
    }


@router.websocket("/ws")
async def assistant_realtime_proxy(websocket: WebSocket):
    current_user = _websocket_user(websocket)
    if not current_user:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "message": "Realtime voice requires an authenticated assistant session"
        })
        await websocket.close(code=1008)
        return

    allowed = await assistant_realtime_guard.allow(websocket)

    if not allowed:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "message": "Realtime connection limit exceeded"
        })
        await websocket.close(code=1013)
        return

    await websocket.accept()
    record_audit_event(
        event_type="assistant.realtime_ws",
        action="connect",
        actor=current_user,
        resource_type="assistant_realtime",
        resource_id="ws",
        metadata={"provider": "openai_realtime", "raw_audio_stored": False},
    )

    if not OPENAI_API_KEY:
        await websocket.send_json({
            "type": "error",
            "message": "OPENAI_API_KEY missing"
        })
        await websocket.close(code=1011)
        await assistant_realtime_guard.disconnect(websocket)
        return

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }

    try:
        async with websockets.connect(
            OPENAI_REALTIME_URL,
            additional_headers=headers,
            max_size=16_000_000,
            ping_interval=20,
            ping_timeout=20,
        ) as upstream:

            async def client_to_openai():
                while True:
                    payload = await websocket.receive_text()
                    await upstream.send(payload)

            async def openai_to_client():
                async for message in upstream:
                    if isinstance(message, bytes):
                        await websocket.send_bytes(message)
                    else:
                        try:
                            parsed = json.loads(message)
                            await websocket.send_json(parsed)
                        except Exception:
                            await websocket.send_text(message)

            await asyncio.gather(
                client_to_openai(),
                openai_to_client(),
            )

    except WebSocketDisconnect:
        return
    except Exception as exc:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(exc)
            })
        except Exception:
            pass

        await websocket.close(code=1011)
    finally:
        record_audit_event(
            event_type="assistant.realtime_ws",
            action="disconnect",
            actor=current_user,
            resource_type="assistant_realtime",
            resource_id="ws",
            metadata={"provider": "openai_realtime", "raw_audio_stored": False},
        )
        await assistant_realtime_guard.disconnect(websocket)