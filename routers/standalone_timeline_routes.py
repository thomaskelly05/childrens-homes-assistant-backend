from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.assistant_security import safe_int
from services.standalone_timeline_intelligence import (
    rebuild_timeline,
    search_timeline,
    timeline,
    timeline_summary,
)

router = APIRouter(prefix="/standalone-timeline", tags=["Standalone Timeline Intelligence"])


class SearchTimelineRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=300)


class TimelineResponse(BaseModel):
    events: list[dict[str, Any]]
    analysis: dict[str, Any]


class TimelineSummaryResponse(BaseModel):
    summary: str
    analysis: dict[str, Any]
    eventCount: int


class RebuildTimelineResponse(BaseModel):
    project_id: str
    created: int


class TimelineSearchResponse(BaseModel):
    results: list[dict[str, Any]]


def _require_user(current_user: dict[str, Any]) -> int:
    user_id = safe_int(current_user.get("user_id") or current_user.get("id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.post("/projects/{project_id}/rebuild", response_model=RebuildTimelineResponse)
def rebuild(project_id: str, current_user=Depends(get_current_user)):
    _require_user(current_user)
    return rebuild_timeline(project_id)


@router.get("/projects/{project_id}", response_model=TimelineResponse)
def get_timeline(project_id: str, current_user=Depends(get_current_user)):
    _require_user(current_user)
    return timeline(project_id)


@router.get("/projects/{project_id}/summary", response_model=TimelineSummaryResponse)
def get_summary(project_id: str, current_user=Depends(get_current_user)):
    _require_user(current_user)
    return timeline_summary(project_id)


@router.post("/projects/{project_id}/search", response_model=TimelineSearchResponse)
def search(project_id: str, payload: SearchTimelineRequest, current_user=Depends(get_current_user)):
    _require_user(current_user)
    return {"results": search_timeline(project_id, payload.query)}
