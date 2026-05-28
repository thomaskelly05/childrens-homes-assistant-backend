"""Standalone ORB Knowledge Library API — reference documents only."""

from __future__ import annotations

import base64
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
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
async def knowledge_health(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.health())


@router.get("/summary")
async def knowledge_summary(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.get_library_summary())


@router.get("/official-sources")
async def official_sources(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.list_official_sources())


@router.get("/sources/needing-review")
async def sources_needing_review(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.list_sources_needing_review())


@router.get("/sources/expired")
async def sources_expired(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.list_expired_sources())


@router.get("/sources")
async def list_sources(
    source_type: str | None = None,
    status: str | None = None,
    governance_status: str | None = None,
    current_user=Depends(require_standalone_orb_access),
):
    sources = orb_knowledge_library_service.list_sources(
        source_type=source_type,
        status=status,
        governance_status=governance_status,
    )
    return _success([source.model_dump() for source in sources])


@router.get("/sources/{source_id}")
async def get_source(source_id: str, current_user=Depends(require_standalone_orb_access)):
    source = orb_knowledge_library_service.get_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source.model_dump())


@router.get("/sources/{source_id}/citation-health")
async def source_citation_health(source_id: str, current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.get_citation_health(source_id).model_dump())


@router.post("/sources")
async def create_source(
    payload: OrbKnowledgeSourceCreate,
    current_user=Depends(require_standalone_orb_access),
):
    source = orb_knowledge_library_service.create_source(payload)
    return _success(source.model_dump())


@router.patch("/sources/{source_id}")
async def update_source(
    source_id: str,
    payload: OrbKnowledgeSourceUpdate,
    current_user=Depends(require_standalone_orb_access),
):
    source = orb_knowledge_library_service.update_source(source_id, payload)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source.model_dump())


@router.patch("/sources/{source_id}/metadata")
async def patch_source_metadata(
    source_id: str,
    payload: OrbKnowledgeSourceMetadataPatch,
    current_user=Depends(require_standalone_orb_access),
):
    source = orb_knowledge_library_service.patch_source_metadata(source_id, payload)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source.model_dump())


@router.post("/sources/{source_id}/approve")
async def approve_source(source_id: str, current_user=Depends(require_standalone_orb_access)):
    source = orb_knowledge_library_service.approve_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source.model_dump())


@router.post("/sources/{source_id}/needs-review")
async def mark_source_needs_review(
    source_id: str,
    reason: str | None = None,
    current_user=Depends(require_standalone_orb_access),
):
    source = orb_knowledge_library_service.mark_needs_review(source_id, reason=reason)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source.model_dump())


@router.post("/sources/{source_id}/archive")
async def archive_source(source_id: str, current_user=Depends(require_standalone_orb_access)):
    source = orb_knowledge_library_service.archive_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source.model_dump())


@router.post("/sources/{source_id}/rebuild-citations")
async def rebuild_citations(source_id: str, current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.rebuild_citations(source_id))


@router.post("/ingest")
async def ingest_text(
    payload: OrbKnowledgeDocumentIngestRequest,
    current_user=Depends(require_standalone_orb_access),
):
    result = orb_knowledge_library_service.ingest_text(payload)
    return _success(result)


@router.post("/ingest-file")
async def ingest_file(
    payload: OrbKnowledgeFileIngestRequest,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        raw = base64.b64decode(payload.content_base64, validate=False)
        result = orb_document_ingestion_service.ingest_file(
            payload.file_name,
            raw,
            payload.content_type,
            title=payload.title,
            source_type=payload.source_type,
            metadata=payload.metadata,
        )
        return _success(result)
    except ValueError as exc:
        detail = str(exc) or UNSUPPORTED_FILE_MESSAGE
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("/import-official")
async def import_official_source(
    payload: OrbKnowledgeOfficialImportRequest,
    current_user=Depends(require_standalone_orb_access),
):
    return _success(orb_knowledge_library_service.import_official_source(payload))


@router.post("/search")
async def search_knowledge(
    payload: OrbKnowledgeSearchRequest,
    current_user=Depends(require_standalone_orb_access),
):
    results = orb_rag_retrieval_service.search(
        payload.query,
        limit=payload.limit,
        source_type=payload.source_type,
    )
    return _success({"query": payload.query, "results": [r.model_dump() for r in results], "total": len(results)})
