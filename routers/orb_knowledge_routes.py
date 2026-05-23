"""Standalone ORB Knowledge Library API — reference documents only."""

from __future__ import annotations

import base64
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from schemas.orb_knowledge import (
    OrbKnowledgeDocumentIngestRequest,
    OrbKnowledgeOfficialImportRequest,
    OrbKnowledgeSearchRequest,
    OrbKnowledgeSourceCreate,
    OrbKnowledgeSourceMetadataPatch,
    OrbKnowledgeSourceUpdate,
)
from services.orb_document_ingestion_service import (
    UNSUPPORTED_FILE_MESSAGE,
    orb_document_ingestion_service,
)
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service

logger = logging.getLogger("indicare.orb_knowledge_routes")

router = APIRouter(prefix="/orb/standalone/knowledge", tags=["ORB Standalone Knowledge"])


class OrbKnowledgeFileIngestRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    file_name: str = Field(..., min_length=1, max_length=300)
    content_base64: str = Field(..., min_length=8, max_length=8_000_000)
    content_type: str | None = Field(default=None, max_length=120)
    source_type: str | None = Field(default=None, max_length=80)
    title: str | None = Field(default=None, max_length=500)
    metadata: dict[str, Any] = Field(default_factory=dict)


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.get("/health")
async def knowledge_health(current_user=Depends(require_assistant_access)):
    return _success(orb_knowledge_library_service.health())


@router.get("/summary")
async def knowledge_summary(current_user=Depends(require_assistant_access)):
    return _success(orb_knowledge_library_service.get_library_summary())


@router.get("/official-sources")
async def official_sources(current_user=Depends(require_assistant_access)):
    return _success(orb_knowledge_library_service.list_official_sources())


@router.get("/sources/needing-review")
async def sources_needing_review(current_user=Depends(require_assistant_access)):
    return _success(orb_knowledge_library_service.list_sources_needing_review())


@router.get("/sources/expired")
async def sources_expired(current_user=Depends(require_assistant_access)):
    return _success(orb_knowledge_library_service.list_expired_sources())


@router.get("/sources")
async def list_sources(
    source_type: str | None = None,
    status: str | None = None,
    governance_status: str | None = None,
    current_user=Depends(require_assistant_access),
):
    sources = orb_knowledge_library_service.list_sources(
        source_type=source_type,
        status=status,
        governance_status=governance_status,
    )
    return _success(sources)


@router.post("/sources")
async def create_source(
    payload: OrbKnowledgeSourceCreate,
    current_user=Depends(require_assistant_access),
):
    created = orb_knowledge_library_service.create_source(payload.model_dump())
    return _success(created)


@router.get("/sources/{source_id}")
async def get_source(source_id: str, current_user=Depends(require_assistant_access)):
    source = orb_knowledge_library_service.get_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    chunks = orb_knowledge_library_service.list_chunks(source_id)
    return _success({"source": source, "chunks": chunks})


@router.get("/sources/{source_id}/citation-health")
async def source_citation_health(source_id: str, current_user=Depends(require_assistant_access)):
    health = orb_knowledge_library_service.get_source_citation_health(source_id)
    if health.get("health_status") == "not_found":
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(health)


@router.post("/sources/{source_id}/approve")
async def approve_source(source_id: str, current_user=Depends(require_assistant_access)):
    updated = orb_knowledge_library_service.approve_source(source_id, current_user=current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(updated)


@router.post("/sources/{source_id}/needs-review")
async def needs_review_source(
    source_id: str,
    reason: str | None = None,
    current_user=Depends(require_assistant_access),
):
    updated = orb_knowledge_library_service.mark_needs_review(source_id, reason)
    if not updated:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(updated)


@router.post("/sources/{source_id}/archive")
async def archive_source(source_id: str, current_user=Depends(require_assistant_access)):
    updated = orb_knowledge_library_service.archive_source(source_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(updated)


@router.patch("/sources/{source_id}/metadata")
async def patch_source_metadata(
    source_id: str,
    payload: OrbKnowledgeSourceMetadataPatch,
    current_user=Depends(require_assistant_access),
):
    updated = orb_knowledge_library_service.update_source_metadata(
        source_id, payload.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(updated)


@router.post("/sources/{source_id}/rebuild-citations")
async def rebuild_citations(source_id: str, current_user=Depends(require_assistant_access)):
    result = orb_knowledge_library_service.rebuild_citations_for_source(source_id)
    if result.get("error") == "not_found":
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(result)


@router.post("/import-official")
async def import_official_source(
    payload: OrbKnowledgeOfficialImportRequest,
    current_user=Depends(require_assistant_access),
):
    try:
        result = orb_document_ingestion_service.ingest_official_source(payload.model_dump())
        return _success(result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("official source import failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not import official source") from exc


@router.delete("/sources/{source_id}")
async def delete_source(source_id: str, current_user=Depends(require_assistant_access)):
    if not orb_knowledge_library_service.delete_or_archive_source(source_id):
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success({"deleted": True, "source_id": source_id})


@router.post("/ingest")
async def ingest_document(
    payload: OrbKnowledgeDocumentIngestRequest,
    current_user=Depends(require_assistant_access),
):
    try:
        result = orb_document_ingestion_service.ingest_text(
            payload.title,
            payload.text,
            payload.source_type,
            metadata=payload.metadata,
            source_label=payload.source_label,
            description=payload.description,
        )
        return _success(result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("knowledge ingest failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not ingest document") from exc


@router.post("/ingest/file")
async def ingest_file(
    payload: OrbKnowledgeFileIngestRequest,
    current_user=Depends(require_assistant_access),
):
    try:
        content_bytes = base64.b64decode(payload.content_base64, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 file content") from exc
    if len(content_bytes) > 5_000_000:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")
    try:
        result = orb_document_ingestion_service.ingest_file(
            payload.file_name,
            content_bytes,
            payload.content_type,
            source_type=payload.source_type,
            metadata=payload.metadata,
        )
        if payload.title:
            orb_knowledge_library_service.update_source(
                result["source"]["id"],
                {"title": payload.title},
            )
        return _success(result)
    except ValueError as exc:
        detail = str(exc)
        status = 415 if "Unsupported" in detail else 400
        raise HTTPException(status_code=status, detail=detail or UNSUPPORTED_FILE_MESSAGE) from exc


@router.post("/search")
async def search_knowledge(
    payload: OrbKnowledgeSearchRequest,
    current_user=Depends(require_assistant_access),
):
    filters = {}
    if payload.source_type:
        filters["source_type"] = payload.source_type
    results = orb_rag_retrieval_service.search(
        payload.query,
        filters=filters or None,
        limit=payload.limit,
    )
    return _success(
        {
            "query": payload.query,
            "results": results,
            "total": len(results),
        }
    )
