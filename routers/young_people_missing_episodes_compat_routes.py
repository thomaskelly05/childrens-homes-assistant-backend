from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.missing_episode_contracts import MissingEpisodeCreateRequest, MissingEpisodeTransitionRequest
from services.missing_episode_service import missing_episode_service

router = APIRouter(prefix="/young-people", tags=["Young People Missing Episodes Compat"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _current_user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _normalise_missing_episode(record: Any) -> dict[str, Any]:
    if hasattr(record, "model_dump"):
        item = record.model_dump(mode="json")
    elif isinstance(record, dict):
        item = dict(record)
    else:
        item = {}

    item.setdefault("record_type", "missing_episode")
    item.setdefault("event_type", "missing_episode")
    item.setdefault("title", "Missing episode")
    item.setdefault("summary", item.get("circumstances") or item.get("lifecycle_state") or "Missing episode recorded")
    item.setdefault("workflow_status", item.get("lifecycle_state") or "reported_missing")
    item.setdefault("severity", item.get("risk_level") or "high")
    item.setdefault("occurred_at", item.get("missing_from") or item.get("created_at"))
    item.setdefault("recorded_at", item.get("created_at") or item.get("missing_from"))
    return item


@router.get("/{young_person_id}/missing-episodes")
def list_young_person_missing_episodes(
    young_person_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    result = missing_episode_service.list(
        conn,
        current_user=current_user,
        home_id=_current_user_home_id(current_user),
        young_person_id=young_person_id,
        limit=100,
    )
    items = [_normalise_missing_episode(item) for item in result.items]
    return {"ok": True, "items": items, "missing_episodes": items, "count": len(items), "total": len(items)}


@router.post("/{young_person_id}/missing-episodes")
def create_young_person_missing_episode(
    young_person_id: int,
    payload: MissingEpisodeCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    if int(payload.young_person_id) != int(young_person_id):
        raise HTTPException(status_code=400, detail="Payload young_person_id must match route young_person_id")

    record = missing_episode_service.create(conn, payload=payload, current_user=current_user)
    item = _normalise_missing_episode(record)
    return {"ok": True, "item": item, "id": item.get("id")}


@router.get("/missing-episodes/{record_id}")
def get_young_person_missing_episode(
    record_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    record = missing_episode_service.get(conn, missing_episode_id=record_id, current_user=current_user)
    if record is None:
        raise HTTPException(status_code=404, detail="Missing episode not found")
    item = _normalise_missing_episode(record)
    return {"ok": True, "item": item}


@router.patch("/missing-episodes/{record_id}")
@router.put("/missing-episodes/{record_id}")
def update_young_person_missing_episode(
    record_id: str,
    payload: MissingEpisodeTransitionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    state = payload.lifecycle_state
    if state == "police_notified" or payload.police_notified_at:
        record = missing_episode_service.mark_police_notified(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)
    elif state in {"returned", "RHI_required"} or payload.returned_at:
        record = missing_episode_service.mark_returned(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)
    elif state == "closed":
        record = missing_episode_service.close(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)
    else:
        record = missing_episode_service.escalate_to_safeguarding(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)

    item = _normalise_missing_episode(record)
    return {"ok": True, "item": item, "id": item.get("id")}
