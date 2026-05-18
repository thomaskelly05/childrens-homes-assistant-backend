from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.missing_episode_contracts import MissingEpisodeCreateRequest, MissingEpisodeTransitionRequest
from services.os_sync_hooks import sync_after_save
from services.workflow_response import gold_standard_response
from services.missing_episode_service import missing_episode_service

router = APIRouter(prefix="/young-people", tags=["Young People Missing Episodes Compat"])


CLOSED_MISSING_STATES = {"closed"}
ACTIVE_MISSING_STATES = {"reported_missing", "police_notified", "return_pending", "returned", "RHI_required", "RHI_completed"}


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _current_user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _empty_transition(notes: str | None = None, lifecycle_state: str | None = None) -> MissingEpisodeTransitionRequest:
    payload: dict[str, Any] = {}
    if notes:
        payload["notes"] = notes
    if lifecycle_state:
        payload["lifecycle_state"] = lifecycle_state
    return MissingEpisodeTransitionRequest(**payload)


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
    item.setdefault("status", item.get("lifecycle_state") or "reported_missing")
    item.setdefault("severity", item.get("risk_level") or "high")
    item.setdefault("occurred_at", item.get("missing_from") or item.get("created_at"))
    item.setdefault("recorded_at", item.get("created_at") or item.get("missing_from"))
    return item


def _sync_missing_episode(item: dict[str, Any]) -> dict[str, Any]:
    try:
        ok = sync_after_save("missing_episodes", item)
        return {"attempted": True, "ok": bool(ok), "source_table": "missing_episodes"}
    except Exception as error:
        return {"attempted": True, "ok": False, "source_table": "missing_episodes", "error": str(error)}


def _missing_episode_response(
    *,
    item: dict[str, Any],
    sync: dict[str, Any] | None = None,
    message: str | None = None,
    workflow: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow=workflow or {"state": item.get("lifecycle_state"), "workflow_status": item.get("workflow_status")},
        sync=sync or {},
        missing_episode=item,
    )


def _transition_record(
    conn,
    *,
    record_id: str,
    payload: MissingEpisodeTransitionRequest,
    current_user: dict[str, Any],
    action: str,
):
    if action == "police_notified":
        return missing_episode_service.mark_police_notified(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)
    if action == "returned":
        return missing_episode_service.mark_returned(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)
    if action == "closed":
        return missing_episode_service.close(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)
    return missing_episode_service.escalate_to_safeguarding(conn, missing_episode_id=record_id, payload=payload, current_user=current_user)


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
    active = [item for item in items if str(item.get("lifecycle_state") or "") not in CLOSED_MISSING_STATES]
    return {"ok": True, "items": active, "missing_episodes": active, "count": len(active), "total": len(active)}


@router.get("/{young_person_id}/missing-episodes/archive")
def list_archived_young_person_missing_episodes(
    young_person_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    result = missing_episode_service.list(
        conn,
        current_user=current_user,
        home_id=_current_user_home_id(current_user),
        young_person_id=young_person_id,
        lifecycle_state="closed",
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
    sync = _sync_missing_episode(item)
    return _missing_episode_response(item=item, sync=sync, message="Missing episode created")


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
    return _missing_episode_response(item=item, message="Missing episode loaded")


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
        record = _transition_record(conn, record_id=record_id, payload=payload, current_user=current_user, action="police_notified")
    elif state in {"returned", "RHI_required"} or payload.returned_at:
        record = _transition_record(conn, record_id=record_id, payload=payload, current_user=current_user, action="returned")
    elif state == "closed":
        record = _transition_record(conn, record_id=record_id, payload=payload, current_user=current_user, action="closed")
    else:
        record = _transition_record(conn, record_id=record_id, payload=payload, current_user=current_user, action="safeguarding")

    item = _normalise_missing_episode(record)
    sync = _sync_missing_episode(item)
    return _missing_episode_response(item=item, sync=sync, message="Missing episode updated")


@router.post("/missing-episodes/{record_id}/submit")
@router.put("/missing-episodes/{record_id}/submit")
def submit_young_person_missing_episode(
    record_id: str,
    payload: MissingEpisodeTransitionRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    transition = payload or _empty_transition(notes="Submitted for safeguarding review", lifecycle_state="return_pending")
    record = _transition_record(conn, record_id=record_id, payload=transition, current_user=current_user, action="safeguarding")
    item = _normalise_missing_episode(record)
    sync = _sync_missing_episode(item)
    return _missing_episode_response(item=item, sync=sync, message="Missing episode submitted")


@router.post("/missing-episodes/{record_id}/approve")
@router.put("/missing-episodes/{record_id}/approve")
def approve_young_person_missing_episode(
    record_id: str,
    payload: MissingEpisodeTransitionRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    transition = payload or _empty_transition(notes="Missing episode reviewed and closed")
    record = _transition_record(conn, record_id=record_id, payload=transition, current_user=current_user, action="closed")
    item = _normalise_missing_episode(record)
    sync = _sync_missing_episode(item)
    return _missing_episode_response(item=item, sync=sync, message="Missing episode approved")


@router.post("/missing-episodes/{record_id}/return")
@router.put("/missing-episodes/{record_id}/return")
def return_young_person_missing_episode(
    record_id: str,
    payload: MissingEpisodeTransitionRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    transition = payload or _empty_transition(notes="Young person returned")
    record = _transition_record(conn, record_id=record_id, payload=transition, current_user=current_user, action="returned")
    item = _normalise_missing_episode(record)
    sync = _sync_missing_episode(item)
    return _missing_episode_response(item=item, sync=sync, message="Missing episode returned")


@router.post("/missing-episodes/{record_id}/archive")
@router.put("/missing-episodes/{record_id}/archive")
def archive_young_person_missing_episode(
    record_id: str,
    payload: MissingEpisodeTransitionRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    transition = payload or _empty_transition(notes="Missing episode archived")
    record = _transition_record(conn, record_id=record_id, payload=transition, current_user=current_user, action="closed")
    item = _normalise_missing_episode(record)
    sync = _sync_missing_episode(item)
    return _missing_episode_response(item=item, sync=sync, message="Missing episode archived")
