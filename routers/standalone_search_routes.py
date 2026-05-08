from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.standalone_operational_search import search_project
from services.standalone_tier_service import assert_feature

router = APIRouter(prefix="/standalone-search", tags=["Standalone Operational Search"])


class OperationalSearchRequest(BaseModel):
    project_id: str = Field(..., min_length=1, max_length=120)
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(40, ge=1, le=100)


@router.post("/operational")
def operational_search(payload: OperationalSearchRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    assert_feature(current_user, "operational_search")
    return {
        "ok": True,
        **search_project(
            project_id=payload.project_id,
            query=payload.query,
            limit=payload.limit,
        ),
    }
