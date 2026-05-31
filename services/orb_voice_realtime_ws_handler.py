from __future__ import annotations

import json
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from auth.routes import settings as auth_settings
from auth.tokens import decode_session_token
from schemas.orb_voice_realtime import validate_client_event
from services.orb_voice_realtime_config import (
    _dev_text_simulation,
    _provider_has_stt_credentials,
    _provider_has_tts_credentials,
)
from services.orb_voice_realtime_session_store import orb_voice_realtime_session_store
from services.session_security_service import is_session_revoked


def _websocket_user(websocket: WebSocket) -> dict[str, Any] | None:
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
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        user_id = None
    return {"id": user_id, "user_id": user_id, "email": payload.get("email"), "role": payload.get("role")}


class OrbVoiceRealtimeWebSocketHandler:
    async def handle(self, websocket: WebSocket, session_id: str) -> None:
        current_user = _websocket_user(websocket)
        if not current_user:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "ORB Voice realtime requires sign-in."})
            await websocket.close(code=1008)
            return

        try:
            session = orb_voice_realtime_session_store.require(session_id)
        except KeyError:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Unknown ORB Voice session."})
            await websocket.close(code=1008)
            return

        if session.user_id is not None and current_user.get("user_id") != session.user_id:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "ORB Voice session does not belong to this user."})
            await websocket.close(code=1008)
            return

        if session.provider != "websocket_realtime" or session.status != "ready":
            await websocket.accept()
            await websocket.send_json(
                {
                    "type": "error",
                    "message": "ORB Voice WebSocket is not configured for this session. Use browser voice fallback.",
                }
            )
            await websocket.close(code=1008)
            return

        await websocket.accept()
        await websocket.send_json(
            {
                "type": "session.ready",
                "session_id": session_id,
                "capabilities": session.capabilities.model_dump(),
            }
        )

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "message": "Invalid JSON event."})
                    continue
                if not isinstance(payload, dict):
                    await websocket.send_json({"type": "error", "message": "Event must be a JSON object."})
                    continue
                try:
                    event = validate_client_event(payload)
                except ValueError as exc:
                    await websocket.send_json({"type": "error", "message": str(exc)})
                    continue
                await self._dispatch(websocket, session_id=session_id, event=event)
        except WebSocketDisconnect:
            orb_voice_realtime_session_store.delete(session_id)

    async def _dispatch(self, websocket: WebSocket, *, session_id: str, event: Any) -> None:
        event_type = event.type
        data = event.data or {}

        if event_type == "ping":
            await websocket.send_json({"type": "pong", "session_id": session_id})
            return

        if event_type == "session.stop":
            orb_voice_realtime_session_store.delete(session_id)
            await websocket.close()
            return

        if event_type == "user.interrupt":
            orb_voice_realtime_session_store.mark_interrupted(session_id)
            await websocket.send_json({"type": "interrupted", "session_id": session_id})
            return

        if event_type == "session.start":
            await websocket.send_json({"type": "session.ready", "session_id": session_id})
            return

        if event_type == "audio.chunk":
            if _provider_has_stt_credentials():
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Streaming STT provider hook reserved — wire ORB_VOICE_PROVIDER_NAME credentials.",
                    }
                )
            else:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Server STT is not configured. Use browser SpeechRecognition.",
                    }
                )
            return

        if event_type == "audio.end":
            if not _provider_has_stt_credentials() and not _dev_text_simulation():
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Server STT is not configured. Use browser SpeechRecognition.",
                    }
                )
            return

        if event_type == "transcript.text":
            text = str(data.get("text") or "").strip()
            if not text:
                await websocket.send_json({"type": "error", "message": "transcript.text requires non-empty text."})
                return
            if _dev_text_simulation() or _provider_has_stt_credentials():
                await websocket.send_json({"type": "stt.partial", "session_id": session_id, "text": text})
                await websocket.send_json({"type": "stt.final", "session_id": session_id, "text": text})
            else:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Server STT is not configured. Use browser SpeechRecognition.",
                    }
                )
            return


orb_voice_realtime_ws_handler = OrbVoiceRealtimeWebSocketHandler()
