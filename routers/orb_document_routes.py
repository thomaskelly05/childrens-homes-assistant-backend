"""Standalone ORB document understanding API — no OS record access."""

from __future__ import annotations

import base64
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.permissions import require_assistant_access
from schemas.orb_documents import (
    OrbDocumentAnalysisRequest,
    OrbDocumentUploadRequest,
)
from services.orb_document_ingestion_service import (
    UNSUPPORTED_FILE_MESSAGE,
    orb_document_ingestion_service,
)
from services.orb_document_understanding_service import orb_document_understanding_service
from services.orb_intelligence_output_service import orb_intelligence_output_service

logger = logging.getLogger("indicare.orb_document_routes")

router = APIRouter(prefix="/orb/standalone/documents", tags=["ORB Standalone Documents"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _reject_os_ids(payload: dict[str, Any]) -> None:
    forbidden_keys = (
        "child_id",
        "young_person_id",
        "staff_id",
        "home_id",
        "record_id",
        "chronology_id",
    )
    scopes = [payload, payload.get("metadata") or {}]
    for scope in scopes:
        if not isinstance(scope, dict):
            continue
        for key in forbidden_keys:
            if scope.get(key) is not None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Standalone ORB documents must not include {key}.",
                )


@router.get("/health")
async def documents_health(current_user=Depends(require_assistant_access)):
    return _success(orb_document_understanding_service.health())


@router.post("/upload")
async def upload_document(
    payload: OrbDocumentUploadRequest,
    current_user=Depends(require_assistant_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        if payload.content_base64 and payload.file_name:
            raw = base64.b64decode(payload.content_base64, validate=False)
            result = orb_document_ingestion_service.ingest_file(
                payload.file_name,
                raw,
                payload.content_type,
                source_type=payload.source_type,
                metadata=payload.metadata,
            )
        elif payload.text:
            result = orb_document_ingestion_service.ingest_text(
                payload.title,
                payload.text,
                payload.source_type,
                metadata=payload.metadata,
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Provide text or content_base64 with file_name.",
            )
        source = result.get("source") or {}
        return _success(
            {
                "source_id": source.get("id"),
                "title": source.get("title") or payload.title,
                "chunk_count": result.get("chunk_count", 0),
                "source_type": source.get("source_type"),
                "status": source.get("status", "indexed"),
                "standalone_only": True,
                "os_linked": False,
                "care_record_access": False,
            }
        )
    except ValueError as exc:
        detail = str(exc)
        if "Unsupported" in detail:
            raise HTTPException(status_code=400, detail=detail or UNSUPPORTED_FILE_MESSAGE) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("/analyse")
async def analyse_document(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_assistant_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        understanding = await orb_document_understanding_service.analyse_document(payload)
        intel = orb_intelligence_output_service.from_document_analysis(understanding)
        envelope = orb_intelligence_output_service.build_save_envelope(
            intel,
            payload,
            created_from="document_analysis",
            created_from_id=understanding.source_id,
            analysis_mode=understanding.analysis_mode,
        )
        return _success(
            {
                "understanding": understanding.model_dump(),
                "standalone_only": True,
                "os_linked": False,
                "care_record_access": False,
                **envelope,
            }
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/action-plan")
async def document_action_plan(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_assistant_access),
):
    payload = payload.model_copy(update={"mode": "action_plan"})
    return await analyse_document(payload, current_user=current_user)


@router.post("/briefing")
async def document_briefing(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_assistant_access),
):
    mode = payload.mode
    if mode not in {"manager_briefing", "staff_briefing"}:
        lower_q = (payload.question or "").lower()
        mode = "manager_briefing" if "staff" not in lower_q else "staff_briefing"
    payload = payload.model_copy(update={"mode": mode})
    return await analyse_document(payload, current_user=current_user)


@router.post("/compare")
async def document_compare(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_assistant_access),
):
    payload = payload.model_copy(update={"mode": "policy_comparison"})
    return await analyse_document(payload, current_user=current_user)


@router.get("/{source_id}/summary")
async def document_summary(
    source_id: str,
    current_user=Depends(require_assistant_access),
):
    try:
        understanding = await orb_document_understanding_service.analyse_source(
            source_id,
            "summarise",
        )
        return _success({"understanding": understanding.model_dump()})
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
