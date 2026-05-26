"""Standalone ORB evaluation API — no OS record access."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_standalone_orb_access
from schemas.orb_evaluation import OrbEvaluationRequest
from services.orb_evaluation_service import orb_evaluation_service

router = APIRouter(prefix="/orb/standalone/evaluation", tags=["ORB Standalone Evaluation"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


class OrbEvaluateDocumentOutputRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    understanding: dict[str, Any]
    analysis_mode: str | None = None


class OrbEvaluateAgentOutputRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer: str = Field(..., min_length=1)
    agent_type: str | None = None
    analysis_mode: str | None = None
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/health")
async def evaluation_health(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_evaluation_service.health())


@router.post("/evaluate-answer")
async def evaluate_answer(
    payload: OrbEvaluationRequest,
    current_user=Depends(require_standalone_orb_access),
):
    result = orb_evaluation_service.evaluate_answer(payload)
    return _success(result.model_dump())


@router.post("/evaluate-document-output")
async def evaluate_document_output(
    payload: OrbEvaluateDocumentOutputRequest,
    current_user=Depends(require_standalone_orb_access),
):
    result = orb_evaluation_service.evaluate_document_output(
        payload.understanding,
        analysis_mode=payload.analysis_mode,
    )
    return _success(result.model_dump())


@router.post("/evaluate-agent-output")
async def evaluate_agent_output(
    payload: OrbEvaluateAgentOutputRequest,
    current_user=Depends(require_standalone_orb_access),
):
    result = orb_evaluation_service.evaluate_agent_output(
        answer=payload.answer,
        sources=payload.sources,
        citations=payload.citations,
        agent_type=payload.agent_type,
        analysis_mode=payload.analysis_mode,
    )
    return _success(result.model_dump())
