from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from services.ai_gateway_service import ai_gateway_service

router = APIRouter(prefix="/api/ai/governance", tags=["AI Governance"])


class EstimateRequest(BaseModel):
    prompt: str
    system_prompt: str | None = None
    model: str | None = None
    max_output_tokens: int | None = None


@router.get("/status")
def governance_status(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
):
    return {
        "ok": True,
        "governance": ai_gateway_service.governance_status(
            provider_id=provider_id,
            home_id=home_id,
        ),
    }


@router.post("/estimate")
def estimate_request(payload: EstimateRequest):
    return {
        "ok": True,
        "estimate": ai_gateway_service.estimate_request(
            prompt=payload.prompt,
            system_prompt=payload.system_prompt,
            model=payload.model or "gpt-4o-mini",
            max_output_tokens=payload.max_output_tokens or 1200,
        ),
    }
