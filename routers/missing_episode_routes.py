from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from schemas.missing_episode_contracts import MissingEpisodeCreateRequest, MissingEpisodeTransitionRequest
from schemas.return_home_interview_contracts import ReturnHomeInterviewCreateRequest
from services.chronology_projection_service import chronology_projection_service
from services.missing_episode_service import missing_episode_service
from services.operational_synthesis_service import operational_synthesis_service
from services.return_home_interview_service import return_home_interview_service

router = APIRouter(prefix="/api/missing-episodes", tags=["missing-episodes"])


def _db() -> Generator[Any, None, None]:
    from db.connection import get_db

    yield from get_db()


@router.post("")
def create_missing_episode(
    payload: MissingEpisodeCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = missing_episode_service.create(conn, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.get("")
def list_missing_episodes(
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    lifecycle_state: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    result = missing_episode_service.list(
        conn,
        current_user=current_user,
        home_id=home_id,
        young_person_id=young_person_id,
        lifecycle_state=lifecycle_state,
        limit=limit,
    )
    return result.model_dump(mode="json")


@router.get("/queues")
def missing_episode_queues(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return missing_episode_service.queues(conn, current_user=current_user, home_id=home_id, limit=limit).model_dump(mode="json")


@router.get("/synthesis")
def missing_episode_synthesis(
    home_id: int | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    records = missing_episode_service.list(conn, current_user=current_user, home_id=home_id, limit=limit).items
    return {"ok": True, **operational_synthesis_service.missing_patterns(records)}


@router.get("/{missing_episode_id}")
def get_missing_episode(
    missing_episode_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = missing_episode_service.get(conn, missing_episode_id=missing_episode_id, current_user=current_user)
    if record is None:
        raise HTTPException(status_code=404, detail="Missing episode not found.")
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.get("/{missing_episode_id}/chronology")
def missing_episode_chronology(
    missing_episode_id: str,
    limit: int = Query(default=100, ge=1, le=300),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return chronology_projection_service.project(
        conn,
        current_user=current_user,
        projection_type="missing_episode",
        entity_type="missing_episode",
        entity_id=missing_episode_id,
        limit=limit,
    )


@router.post("/{missing_episode_id}/police-notified")
def police_notified(
    missing_episode_id: str,
    payload: MissingEpisodeTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = missing_episode_service.mark_police_notified(conn, missing_episode_id=missing_episode_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.post("/{missing_episode_id}/returned")
def returned_home(
    missing_episode_id: str,
    payload: MissingEpisodeTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = missing_episode_service.mark_returned(conn, missing_episode_id=missing_episode_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.post("/{missing_episode_id}/safeguarding-escalation")
def safeguarding_escalation(
    missing_episode_id: str,
    payload: MissingEpisodeTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = missing_episode_service.escalate_to_safeguarding(conn, missing_episode_id=missing_episode_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.post("/{missing_episode_id}/return-home-interviews")
def create_return_home_interview(
    missing_episode_id: str,
    payload: ReturnHomeInterviewCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    data = payload.model_copy(update={"missing_episode_id": missing_episode_id})
    record = return_home_interview_service.create(conn, payload=data, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}


@router.post("/{missing_episode_id}/close")
def close_missing_episode(
    missing_episode_id: str,
    payload: MissingEpisodeTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    record = missing_episode_service.close(conn, missing_episode_id=missing_episode_id, payload=payload, current_user=current_user)
    return {"ok": True, "item": record.model_dump(mode="json")}
