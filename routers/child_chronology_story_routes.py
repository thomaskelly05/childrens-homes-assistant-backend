"""Child chronology story routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.child_chronology_story import ChronologyStoryFilter
from services.child_chronology_story_service import child_chronology_story_service

router = APIRouter(prefix="/chronology-story", tags=["Chronology Story"])
compat_router = APIRouter(prefix="/api/chronology-story", tags=["Chronology Story API"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data, "operational_only": True, "standalone_access": False}


@router.get("/{child_id}")
async def build_chronology_story(
    child_id: int,
    search: str | None = None,
    record_type: str | None = None,
    author_user_id: str | None = None,
    plan_impact: bool | None = None,
    safeguarding_sensitive: bool | None = Query(None),
    lifeecho_memories: bool | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = ChronologyStoryFilter(
        child_id=child_id,
        search=search,
        record_type=record_type,
        author_user_id=author_user_id,
        plan_impact=plan_impact,
        safeguarding_sensitive=safeguarding_sensitive,
        lifeecho_memories=lifeecho_memories,
    )
    user = current_user if isinstance(current_user, dict) else dict(current_user)
    return _success(
        child_chronology_story_service.build_story(filters, user, conn=conn).model_dump()
    )


@compat_router.get("/{child_id}")
async def api_build_chronology_story(child_id: int, **kwargs):
    return await build_chronology_story(child_id=child_id, **kwargs)
