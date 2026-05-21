from __future__ import annotations

import json

from fastapi import APIRouter, Header, HTTPException, Request

from life_echo.auth.api_keys import LifeEchoApiKeyManager
from life_echo.schemas import LifeEchoEventCreate
from life_echo.services import life_echo_service

router = APIRouter(prefix="/api/life-echo/webhooks", tags=["LifeEcho Webhooks"])


@router.post("/ingest")
async def ingest_event(
    request: Request,
    x_life_echo_signature: str | None = Header(default=None),
):
    body = await request.body()
    payload_text = body.decode("utf-8")

    if not x_life_echo_signature:
        raise HTTPException(status_code=401, detail="Missing LifeEcho signature")

    if not LifeEchoApiKeyManager.verify_signature(
        payload_text,
        x_life_echo_signature,
    ):
        raise HTTPException(status_code=403, detail="Invalid LifeEcho signature")

    payload = json.loads(payload_text)
    event = LifeEchoEventCreate(**payload)
    created = life_echo_service.create_event(event)

    return {
        "ok": True,
        "event_id": created.id,
        "source_system": created.source_system,
    }
