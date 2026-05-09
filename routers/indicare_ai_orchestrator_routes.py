from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from services.indicare_ai_orchestrator_service import IndiCareAIOrchestratorService

router = APIRouter(prefix="/assistant/orchestrator", tags=["IndiCare AI Orchestrator"])
service = IndiCareAIOrchestratorService()


class OrchestratorRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question: str = Field(..., min_length=1, max_length=12000)
    project_id: str | None = "standalone"
    young_person_id: int | None = None
    home_id: int | None = None
    limit: int | None = 8


@router.post("/context")
def build_assistant_context(
    payload: OrchestratorRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.build_context(
        question=payload.question,
        current_user=current_user,
        project_id=payload.project_id,
        young_person_id=payload.young_person_id,
        home_id=payload.home_id,
        limit=payload.limit or 8,
    )
