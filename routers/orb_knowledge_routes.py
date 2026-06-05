"""Standalone ORB Knowledge Library API — reference documents only."""

from __future__ import annotations

import base64
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_knowledge_admin_dependency import require_orb_knowledge_admin
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
from services.orb_public_evidence_intelligence_service import orb_public_evidence_intelligence_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service
from services.orb_sector_evidence_pipeline_service import orb_sector_evidence_pipeline_service

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


class OrbKnowledgeUrlImportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    url: str = Field(..., min_length=8, max_length=2000)
    pipeline_id: str | None = Field(default=None, max_length=120)
    kind: str | None = Field(default=None, max_length=120)
    title: str | None = Field(default=None, max_length=500)
    approve_now: bool = True


class OrbKnowledgePipelineSearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str = Field(..., min_length=1, max_length=2000)
    pipeline_id: str | None = Field(default=None, max_length=120)
    limit: int = Field(default=8, ge=1, le=30)


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _viewer_user_id(current_user: dict[str, Any]) -> int | None:
    uid = current_user.get("user_id") or current_user.get("id")
    return int(uid) if uid is not None else None


def _payload_dict(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return payload
    if hasattr(payload, "model_dump"):
        return payload.model_dump()
    return dict(payload)


@router.get("/health")
async def knowledge_health(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.health())


@router.get("/summary")
async def knowledge_summary(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.get_library_summary())


@router.get("/official-sources")
async def official_sources(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.list_official_sources())


@router.get("/official/curated")
async def curated_official_guidance(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_knowledge_library_service.list_curated_official_guidance())


@router.get("/sources/needing-review")
async def sources_needing_review(_admin=Depends(require_orb_knowledge_admin)):
    return _success(orb_knowledge_library_service.list_sources_needing_review())


@router.get("/sources/expired")
async def sources_expired(_admin=Depends(require_orb_knowledge_admin)):
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
        viewer_user_id=_viewer_user_id(current_user),
    )
    return _success(sources)


@router.get("/sources/{source_id}")
async def get_source(source_id: str, current_user=Depends(require_standalone_orb_access)):
    source = orb_knowledge_library_service.get_source(
        source_id, viewer_user_id=_viewer_user_id(current_user)
    )
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source)


@router.get("/sources/{source_id}/citation-health")
async def source_citation_health(source_id: str, current_user=Depends(require_standalone_orb_access)):
    source = orb_knowledge_library_service.get_source(
        source_id, viewer_user_id=_viewer_user_id(current_user)
    )
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(orb_knowledge_library_service.get_citation_health(source_id).model_dump())


@router.post("/sources")
async def create_source(
    payload: OrbKnowledgeSourceCreate,
    _admin=Depends(require_orb_knowledge_admin),
):
    source = orb_knowledge_library_service.create_source(_payload_dict(payload))
    return _success(source)


@router.patch("/sources/{source_id}")
async def update_source(
    source_id: str,
    payload: OrbKnowledgeSourceUpdate,
    _admin=Depends(require_orb_knowledge_admin),
):
    source = orb_knowledge_library_service.update_source(source_id, _payload_dict(payload))
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source)


@router.patch("/sources/{source_id}/metadata")
async def patch_source_metadata(
    source_id: str,
    payload: OrbKnowledgeSourceMetadataPatch,
    _admin=Depends(require_orb_knowledge_admin),
):
    source = orb_knowledge_library_service.patch_source_metadata(
        source_id, _payload_dict(payload)
    )
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source)


@router.post("/sources/{source_id}/approve")
async def approve_source(source_id: str, _admin=Depends(require_orb_knowledge_admin)):
    source = orb_knowledge_library_service.approve_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source)


@router.post("/sources/{source_id}/needs-review")
async def mark_source_needs_review(
    source_id: str,
    reason: str | None = None,
    _admin=Depends(require_orb_knowledge_admin),
):
    source = orb_knowledge_library_service.mark_needs_review(source_id, reason=reason)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source)


@router.post("/sources/{source_id}/archive")
async def archive_source(source_id: str, _admin=Depends(require_orb_knowledge_admin)):
    source = orb_knowledge_library_service.archive_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    return _success(source)


@router.post("/sources/{source_id}/rebuild-citations")
async def rebuild_citations(source_id: str, _admin=Depends(require_orb_knowledge_admin)):
    return _success(orb_knowledge_library_service.rebuild_citations(source_id))


@router.post("/ingest")
async def ingest_text(
    payload: OrbKnowledgeDocumentIngestRequest,
    current_user=Depends(require_standalone_orb_access),
):
    data = _payload_dict(payload)
    uid = _viewer_user_id(current_user)
    if uid is not None:
        metadata = dict(data.get("metadata") or {})
        metadata.setdefault("uploaded_by_user_id", uid)
        metadata.setdefault("owner_user_id", uid)
        metadata.setdefault("source_scope", "user_private")
        data["metadata"] = metadata
    result = orb_knowledge_library_service.ingest_text(data)
    return _success(result)


@router.post("/ingest-file")
async def ingest_file(
    payload: OrbKnowledgeFileIngestRequest,
    current_user=Depends(require_standalone_orb_access),
):
    try:
        raw = base64.b64decode(payload.content_base64, validate=False)
        metadata = dict(payload.metadata or {})
        uid = _viewer_user_id(current_user)
        if uid is not None:
            metadata.setdefault("uploaded_by_user_id", uid)
            metadata.setdefault("source_scope", "user_private")
            metadata.setdefault("owner_user_id", uid)
        result = orb_document_ingestion_service.ingest_file(
            payload.file_name,
            raw,
            payload.content_type,
            title=payload.title,
            source_type=payload.source_type or "user_uploaded",
            metadata=metadata,
        )
        return _success(result)
    except ValueError as exc:
        detail = str(exc) or UNSUPPORTED_FILE_MESSAGE
        raise HTTPException(status_code=400, detail=detail) from exc


@router.post("/import-official")
async def import_official_source(
    payload: OrbKnowledgeOfficialImportRequest,
    _admin=Depends(require_orb_knowledge_admin),
):
    data = payload.model_dump() if hasattr(payload, "model_dump") else payload
    return _success(orb_knowledge_library_service.import_official_source(data))


@router.post("/search")
async def search_knowledge(
    payload: OrbKnowledgeSearchRequest,
    current_user=Depends(require_standalone_orb_access),
):
    filters: dict[str, Any] = {}
    if payload.source_type:
        filters["source_type"] = payload.source_type
    viewer_user_id = _viewer_user_id(current_user)
    results = orb_rag_retrieval_service.search(
        payload.query,
        limit=payload.limit,
        filters=filters or None,
        viewer_user_id=viewer_user_id,
    )
    serialised = [
        r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in results
    ]
    return _success({"query": payload.query, "results": serialised, "total": len(serialised)})


@router.get("/public-evidence/status")
async def public_evidence_status(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_public_evidence_intelligence_service.status())


@router.post("/public-evidence/seed-registry")
async def seed_public_evidence_registry(_admin=Depends(require_orb_knowledge_admin)):
    return _success(orb_public_evidence_intelligence_service.seed_registry())


@router.post("/public-evidence/import-url")
async def import_public_evidence_url(
    payload: OrbKnowledgeUrlImportRequest,
    _admin=Depends(require_orb_knowledge_admin),
):
    if payload.pipeline_id:
        result = await orb_sector_evidence_pipeline_service.import_url(
            payload.pipeline_id,
            payload.url,
            title=payload.title,
            approve_now=payload.approve_now,
        )
    else:
        result = await orb_public_evidence_intelligence_service.import_url(
            payload.url,
            kind=payload.kind,
            title=payload.title,
            approve_now=payload.approve_now,
        )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result)
    return _success(result)


@router.post("/public-evidence/search")
async def search_public_evidence(
    payload: OrbKnowledgePipelineSearchRequest,
    current_user=Depends(require_standalone_orb_access),
):
    if payload.pipeline_id:
        return _success(
            orb_sector_evidence_pipeline_service.search_pipeline(
                payload.pipeline_id,
                payload.query,
                limit=payload.limit,
            )
        )
    return _success(orb_public_evidence_intelligence_service.search(payload.query, limit=payload.limit))


@router.get("/pipelines")
async def list_sector_evidence_pipelines(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_sector_evidence_pipeline_service.list_pipelines())


@router.get("/pipelines/brains")
async def sector_evidence_brains(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_sector_evidence_pipeline_service.brains_map())


@router.get("/pipelines/status")
async def sector_evidence_pipeline_status(current_user=Depends(require_standalone_orb_access)):
    return _success(orb_sector_evidence_pipeline_service.status())


@router.get("/pipelines/{pipeline_id}")
async def get_sector_evidence_pipeline(
    pipeline_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    pipeline = orb_sector_evidence_pipeline_service.get_pipeline(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Sector evidence pipeline not found")
    return _success(pipeline)


@router.post("/pipelines/{pipeline_id}/seed")
async def seed_sector_evidence_pipeline(
    pipeline_id: str,
    _admin=Depends(require_orb_knowledge_admin),
):
    result = await orb_sector_evidence_pipeline_service.seed_pipeline(pipeline_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result)
    return _success(result)
