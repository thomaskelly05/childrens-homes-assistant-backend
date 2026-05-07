from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.assistant_security import safe_int
from services.standalone_enterprise_intelligence import (
    create_relationship,
    extract_chronology,
    generate_dashboard,
    index_project,
    multi_document_reasoning,
    semantic_search,
)

router = APIRouter(prefix="/standalone-enterprise", tags=["Standalone Enterprise Intelligence"])


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=300)
    limit: int = 8


class RelationshipRequest(BaseModel):
    sourceType: str
    sourceId: str
    targetType: str
    targetId: str
    relationshipType: str


class GenericResponse(BaseModel):
    ok: bool = True


class SearchResponse(BaseModel):
    results: list[dict[str, Any]]


class DashboardResponse(BaseModel):
    dashboard: dict[str, Any]


class ReasoningResponse(BaseModel):
    reasoning: dict[str, Any]


class IndexResponse(BaseModel):
    indexed_chunks: int
    project_id: str


class ChronologyResponse(BaseModel):
    project_id: str
    chronology_entries_created: int


class RelationshipResponse(BaseModel):
    relationship: dict[str, Any]


def _user_id(current_user: dict[str, Any]) -> int:
    user_id = safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.post("/projects/{project_id}/index", response_model=IndexResponse)
def index(project_id: str, current_user=Depends(get_current_user)):
    _user_id(current_user)
    return index_project(project_id)


@router.post("/projects/{project_id}/semantic-search", response_model=SearchResponse)
def search(project_id: str, payload: SearchRequest, current_user=Depends(get_current_user)):
    _user_id(current_user)
    results = semantic_search(project_id, payload.query, payload.limit)
    return {"results": results}


@router.post("/projects/{project_id}/chronology-extraction", response_model=ChronologyResponse)
def chronology(project_id: str, current_user=Depends(get_current_user)):
    _user_id(current_user)
    return extract_chronology(project_id)


@router.post("/projects/{project_id}/dashboard", response_model=DashboardResponse)
def dashboard(project_id: str, current_user=Depends(get_current_user)):
    _user_id(current_user)
    return generate_dashboard(project_id)


@router.post("/projects/{project_id}/multi-document-reasoning", response_model=ReasoningResponse)
def reasoning(project_id: str, current_user=Depends(get_current_user)):
    _user_id(current_user)
    return {"reasoning": multi_document_reasoning(project_id)}


@router.post("/projects/{project_id}/relationships", response_model=RelationshipResponse)
def relationship(project_id: str, payload: RelationshipRequest, current_user=Depends(get_current_user)):
    _user_id(current_user)
    result = create_relationship(
        project_id,
        payload.sourceType,
        payload.sourceId,
        payload.targetType,
        payload.targetId,
        payload.relationshipType,
    )
    return {"relationship": result}
