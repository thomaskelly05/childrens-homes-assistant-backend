from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from services.indicare_ai_memory_service import IndiCareAIMemoryService

router = APIRouter(prefix="/assistant/memory", tags=["IndiCare AI Memory"])
service = IndiCareAIMemoryService()


class MemoryCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=180)
    summary: str = Field(..., min_length=1, max_length=3000)
    themes: list[str] | None = None
    project_id: str | None = None
    conversation_id: str | None = None
    mode: str | None = "general"
    memory_type: str | None = "conversation_theme"
    home_id: int | None = None
    young_person_id: int | None = None
    source: str | None = "assistant"
    confidence: float | None = 0.7


@router.post("/items")
def add_memory_item(
    payload: MemoryCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.add_memory(
        current_user=current_user,
        title=payload.title,
        summary=payload.summary,
        themes=payload.themes or [],
        project_id=payload.project_id,
        conversation_id=payload.conversation_id,
        mode=payload.mode or "general",
        memory_type=payload.memory_type or "conversation_theme",
        home_id=payload.home_id,
        young_person_id=payload.young_person_id,
        source=payload.source or "assistant",
        confidence=payload.confidence or 0.7,
    )


@router.get("/items")
def recent_memory_items(
    project_id: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=30),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.recent_memories(
        current_user=current_user,
        project_id=project_id,
        home_id=home_id,
        young_person_id=young_person_id,
        limit=limit,
    )


@router.get("/context")
def memory_prompt_context(
    project_id: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return {
        "ok": True,
        "prompt_context": service.prompt_context(
            current_user=current_user,
            project_id=project_id,
            home_id=home_id,
            young_person_id=young_person_id,
            limit=limit,
        ),
    }
