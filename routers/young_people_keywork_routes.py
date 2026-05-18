from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.workflow_response import gold_standard_response, sync_not_observed
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_keywork_service import YoungPersonKeyworkService

router = APIRouter(prefix="/young-people", tags=["Young People Keywork"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")


def _assert_can_review(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to review this record")


def _load_and_check_young_person(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    person = YoungPersonKeyworkService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_keywork(conn, keywork_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonKeyworkService.get_keywork_row(conn, keywork_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _keywork_gold_response(
    conn,
    *,
    keywork_id: int,
    result: dict[str, Any] | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    result = result or {}
    item = YoungPersonKeyworkService.get_keywork(conn, keywork_id)
    return gold_standard_response(
        id=keywork_id,
        item=item,
        message=message or result.get("message"),
        workflow=result.get("workflow") or {},
        sync=result.get("sync") or sync_not_observed(),
        keywork=item,
        legacy=result,
    )


class KeyworkCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_date: str
    worker_id: int | None = None
    topic: str
    purpose: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    reflective_analysis: str | None = None
    actions_agreed: str | None = None
    next_session_date: str | None = None
    status: str | None = "draft"
    archived: bool | None = False


class KeyworkUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_date: str | None = None
    worker_id: int | None = None
    topic: str | None = None
    purpose: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    reflective_analysis: str | None = None
    actions_agreed: str | None = None
    next_session_date: str | None = None
    status: str | None = None
    archived: bool | None = None
    manager_review_comment: str | None = None


class ReviewPayload(BaseModel):
    review_note: str | None = None
    approved_by: int | None = None


@router.get("/{young_person_id}/keywork")
def list_keywork(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonKeyworkService.list_keywork(conn, young_person_id)
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/keywork/archive")
def list_archived_keywork(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonKeyworkService.list_keywork(conn, young_person_id, archived=True)
    return {"items": rows, "count": len(rows)}


@router.get("/keywork/{keywork_id}")
def get_keywork(
    keywork_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_keywork(conn, keywork_id, current_user)
    return YoungPersonKeyworkService.get_keywork(conn, keywork_id)


@router.post("/{young_person_id}/keywork")
def create_keywork(
    young_person_id: int,
    payload: KeyworkCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)

    result = YoungPersonKeyworkService.create_keywork(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
    keywork_id = _safe_int(result.get("id") if isinstance(result, dict) else None)
    if not keywork_id:
        return result
    return _keywork_gold_response(conn, keywork_id=keywork_id, result=result, message="Keywork session created")


@router.patch("/keywork/{keywork_id}")
@router.put("/keywork/{keywork_id}")
def update_keywork(
    keywork_id: int,
    payload: KeyworkUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_keywork(conn, keywork_id, current_user)

    result = YoungPersonKeyworkService.update_keywork(
        conn,
        keywork_id=keywork_id,
        payload=payload.model_dump(exclude_unset=True),
        actor_user_id=_safe_int(current_user.get("user_id")),
    )
    return _keywork_gold_response(conn, keywork_id=keywork_id, result=result, message="Keywork session updated")


@router.post("/keywork/{keywork_id}/submit")
@router.put("/keywork/{keywork_id}/submit")
def submit_keywork(
    keywork_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_keywork(conn, keywork_id, current_user)

    result = YoungPersonKeyworkService.submit_keywork(
        conn,
        keywork_id=keywork_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
    return _keywork_gold_response(conn, keywork_id=keywork_id, result=result, message="Keywork session submitted")


@router.post("/keywork/{keywork_id}/approve")
@router.put("/keywork/{keywork_id}/approve")
def approve_keywork(
    keywork_id: int,
    payload: ReviewPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_keywork(conn, keywork_id, current_user)

    result = YoungPersonKeyworkService.approve_keywork(
        conn,
        keywork_id=keywork_id,
        approved_by=payload.approved_by or _safe_int(current_user.get("user_id")),
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )
    return _keywork_gold_response(conn, keywork_id=keywork_id, result=result, message="Keywork session approved")


@router.post("/keywork/{keywork_id}/return")
@router.put("/keywork/{keywork_id}/return")
def return_keywork(
    keywork_id: int,
    payload: ReviewPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_keywork(conn, keywork_id, current_user)

    result = YoungPersonKeyworkService.return_keywork(
        conn,
        keywork_id=keywork_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )
    return _keywork_gold_response(conn, keywork_id=keywork_id, result=result, message="Keywork session returned")


@router.post("/keywork/{keywork_id}/archive")
@router.put("/keywork/{keywork_id}/archive")
def archive_keywork(
    keywork_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_keywork(conn, keywork_id, current_user)

    result = YoungPersonKeyworkService.archive_keywork(
        conn,
        keywork_id=keywork_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
    return _keywork_gold_response(conn, keywork_id=keywork_id, result=result, message="Keywork session archived")
