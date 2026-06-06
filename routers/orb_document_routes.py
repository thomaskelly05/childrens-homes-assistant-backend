"""Standalone ORB document understanding API — no OS record access."""

from __future__ import annotations

import base64
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_document_intelligence import OrbDocumentIntelligenceRequest
from schemas.orb_documents import (
    OrbDocumentAnalysisRequest,
    OrbDocumentUploadRequest,
)
from services.orb_document_ingestion_service import (
    UNSUPPORTED_FILE_MESSAGE,
    orb_document_ingestion_service,
)
from services.orb_document_intelligence_service import orb_document_intelligence_service
from services.orb_document_understanding_service import orb_document_understanding_service
from services.orb_ai_abuse_guard_service import (
    enforce_comparison_text_length,
    enforce_daily_ai_call_budget,
    enforce_document_text_length,
)
from services.orb_intelligence_output_service import orb_intelligence_output_service

logger = logging.getLogger("indicare.orb_document_routes")

router = APIRouter(prefix="/orb/standalone/documents", tags=["ORB Standalone Documents"])

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
BLOCKED_DOCUMENT_SUFFIXES = frozenset(
    {".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".sh", ".bash", ".php", ".html", ".htm", ".js", ".jar", ".zip", ".rar"}
)
ALLOWED_DOCUMENT_SUFFIXES = frozenset({".txt", ".md", ".pdf", ".docx"})


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _user_id_from(current_user: dict[str, Any]) -> int | None:
    raw = current_user.get("user_id") or current_user.get("id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _enforce_document_abuse_guards(
    payload: OrbDocumentAnalysisRequest,
    current_user: dict[str, Any],
    *,
    comparison: bool = False,
) -> None:
    user_id = _user_id_from(current_user)
    enforce_daily_ai_call_budget(user_id)
    if payload.text:
        if comparison:
            enforce_comparison_text_length(payload.text, user_id=user_id)
        else:
            enforce_document_text_length(payload.text, user_id=user_id)


def _reject_os_ids(payload: dict[str, Any]) -> None:
    forbidden_keys = (
        "child_id",
        "young_person_id",
        "staff_id",
        "home_id",
        "record_id",
        "chronology_id",
    )
    scopes = [payload, payload.get("metadata") or {}, payload.get("context") or {}]
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
    return _success(
        {
            **orb_document_understanding_service.health(),
            "document_intelligence": orb_document_intelligence_service.health(),
        }
    )


@router.get("/lenses")
async def document_lenses(current_user=Depends(require_standalone_orb_access)):
    return _success({"lenses": orb_document_intelligence_service.list_lenses()})


@router.post("/upload")
async def upload_document(
    payload: OrbDocumentUploadRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        if payload.content_base64 and payload.file_name:
            suffix = (payload.file_name.rsplit(".", 1)[-1] if "." in payload.file_name else "").lower()
            normalized_suffix = f".{suffix}" if suffix else ""
            if normalized_suffix in BLOCKED_DOCUMENT_SUFFIXES:
                raise HTTPException(status_code=400, detail="Unsupported or unsafe document file type.")
            if normalized_suffix and normalized_suffix not in ALLOWED_DOCUMENT_SUFFIXES:
                raise HTTPException(status_code=400, detail=UNSUPPORTED_FILE_MESSAGE)
            raw = base64.b64decode(payload.content_base64, validate=False)
            if len(raw) > MAX_DOCUMENT_BYTES:
                raise HTTPException(status_code=400, detail="Document file is too large.")
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
        detail = str(exc) or UNSUPPORTED_FILE_MESSAGE
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("/analyse")
async def analyse_document(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    _enforce_document_abuse_guards(payload, current_user, comparison=payload.mode == "policy_comparison")
    lens = getattr(payload, "lens", None)
    if lens:
        intel_request = OrbDocumentIntelligenceRequest(
            document_text=payload.text,
            document_source_id=payload.source_id,
            document_title=payload.title,
            lens=lens,
            question=payload.question,
            include_evaluation=payload.include_evaluation,
        )
        result = await orb_document_intelligence_service.run(intel_request)
        return _success(result.data.model_dump())

    understanding = await orb_document_understanding_service.analyse_document(payload)
    if payload.include_evaluation:
        output = orb_intelligence_output_service.from_document_analysis(understanding)
        understanding.evaluation = output.quality.model_dump()
    return _success({"understanding": understanding.model_dump()})


@router.post("/intelligence")
async def document_intelligence(
    payload: OrbDocumentIntelligenceRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_os_ids(payload.model_dump())
    try:
        result = await orb_document_intelligence_service.run(payload)
        return result.model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/action-plan")
async def document_action_plan(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_standalone_orb_access),
):
    payload.mode = "action_plan"
    return await analyse_document(payload, current_user=current_user)


@router.post("/briefing")
async def document_briefing(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_standalone_orb_access),
):
    payload.mode = "manager_briefing"
    return await analyse_document(payload, current_user=current_user)


@router.post("/compare")
async def document_compare(
    payload: OrbDocumentAnalysisRequest,
    current_user=Depends(require_standalone_orb_access),
):
    payload.mode = "policy_comparison"
    return await analyse_document(payload, current_user=current_user)


@router.get("/summary/{source_id}")
async def document_summary(
    source_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    payload = OrbDocumentAnalysisRequest(mode="summarise", source_id=source_id)
    return await analyse_document(payload, current_user=current_user)
