"""Standalone ORB document understanding API — no OS record access."""

from __future__ import annotations

import base64
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
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
async def documents_health(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_document_understanding_service.health())


@router.post("/upload")
async def upload_document(
    payload: OrbDocumentUploadRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        if payload.content_base64 and payload.file_name:
            raw = base64.b64decode(payload.content_base64, validate=False)
            result = orb_document_ingestion_service.ingest_file(
                payload.file_name,
                raw,
                payload.content_type,
                title=payload.title,
                source_type=payload.source_type,
                metadata=payload.metadata,
            )
        else:
            result = orb_document_ingestion_service.ingest_text(
                title=payload.title,
                text=payload.text or "",
                source_type=payload.source_type,
                metadata=payload.metadata,
            )
        return _success(result)
    except ValueError as exc:
        detail = str(exc) or UNSUPPORTED_FILE_MESSAGE
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("/analyse")
async def analyse_document(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    understanding = orb_document_understanding_service.analyse(payload)
    if payload.include_evaluation:
        output = orb_intelligence_output_service.from_document_understanding(understanding)
        understanding.evaluation = output.quality.model_dump()
    return _success({"understanding": understanding.model_dump()})
