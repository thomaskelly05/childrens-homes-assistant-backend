from __future__ import annotations

import asyncio
import json
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

from middleware.assistant_realtime_guard import assistant_realtime_guard

router = APIRouter(prefix="/assistant/realtime", tags=["Assistant Realtime Proxy"])

OPENAI_REALTIME_URL = os.getenv(
    "OPENAI_REALTIME_URL",
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


@router.websocket("/ws")
async def assistant_realtime_proxy(websocket: WebSocket):
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

    if not OPENAI_API_KEY:
        await websocket.send_json({
            "type": "error",
            "message": "OPENAI_API_KEY missing"
        })
        await websocket.close(code=1011)
        await assistant_realtime_guard.disconnect(websocket)
        return

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1"
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
        await assistant_realtime_guard.disconnect(websocket)
