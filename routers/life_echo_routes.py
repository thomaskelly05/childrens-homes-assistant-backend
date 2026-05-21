from __future__ import annotations

from fastapi import APIRouter

from life_echo.schemas import (
    LifeEchoEvent,
    LifeEchoEventCreate,
    LifeEchoInsight,
    LifeEchoPluginManifest,
    LifeEchoTimelineResponse,
)
from life_echo.services import life_echo_service

router = APIRouter(prefix="/api/life-echo", tags=["LifeEcho"])


@router.get("/manifest", response_model=LifeEchoPluginManifest)
def get_manifest() -> LifeEchoPluginManifest:
    return LifeEchoPluginManifest()


@router.post("/events", response_model=LifeEchoEvent)
def create_event(payload: LifeEchoEventCreate) -> LifeEchoEvent:
    return life_echo_service.create_event(payload)


@router.get("/timeline/{child_id}", response_model=LifeEchoTimelineResponse)
def get_timeline(child_id: str) -> LifeEchoTimelineResponse:
    events = life_echo_service.get_timeline(child_id)
    return LifeEchoTimelineResponse(
        child_id=child_id,
        count=len(events),
        events=events,
    )


@router.get("/insights/{child_id}", response_model=LifeEchoInsight)
def get_insights(child_id: str) -> LifeEchoInsight:
    return life_echo_service.generate_insight(child_id)
