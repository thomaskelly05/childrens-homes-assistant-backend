from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from services.indicare_ai_realtime_service import IndiCareAIRealtimeService

router = APIRouter(prefix="/assistant/realtime", tags=["IndiCare AI Realtime"])
service = IndiCareAIRealtimeService()


class StartRealtimeSessionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    project_id: str | None = "standalone"
    mode: str | None = "children_home_specialist"


class PrepareRealtimeTurnRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str | None = None
    text: str = Field(..., min_length=1, max_length=12000)
    project_id: str | None = "standalone"
    young_person_id: int | None = None
    home_id: int | None = None


class InterruptRealtimeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str = Field(..., min_length=1)
    reason: str | None = "user_interrupted"


class EndRealtimeSessionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str = Field(..., min_length=1)


@router.post("/sessions")
def start_realtime_session(
    payload: StartRealtimeSessionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.start_session(
        current_user=current_user,
        project_id=payload.project_id,
        mode=payload.mode,
    )


@router.post("/turns/prepare")
def prepare_realtime_turn(
    payload: PrepareRealtimeTurnRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    session_id = payload.session_id
    if not session_id:
        started = service.start_session(current_user=current_user, project_id=payload.project_id)
        session_id = started["session_id"]
    return service.prepare_turn(
        session_id=session_id,
        text=payload.text,
        current_user=current_user,
        project_id=payload.project_id,
        young_person_id=payload.young_person_id,
        home_id=payload.home_id,
    )


@router.post("/interrupt")
def interrupt_realtime_session(payload: InterruptRealtimeRequest):
    return service.interrupt(session_id=payload.session_id, reason=payload.reason)


@router.post("/sessions/end")
def end_realtime_session(payload: EndRealtimeSessionRequest):
    return service.end_session(session_id=payload.session_id)
