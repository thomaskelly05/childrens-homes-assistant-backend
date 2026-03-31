from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
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

    return YoungPersonKeyworkService.create_keywork(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )


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

    return YoungPersonKeyworkService.update_keywork(
        conn,
        keywork_id=keywork_id,
        payload=payload.model_dump(exclude_unset=True),
        actor_user_id=_safe_int(current_user.get("user_id")),
    )


@router.post("/keywork/{keywork_id}/submit")
@router.put("/keywork/{keywork_id}/submit")
def submit_keywork(
    keywork_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_keywork(conn, keywork_id, current_user)

    return YoungPersonKeyworkService.submit_keywork(
        conn,
        keywork_id=keywork_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )


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

    return YoungPersonKeyworkService.approve_keywork(
        conn,
        keywork_id=keywork_id,
        approved_by=payload.approved_by or _safe_int(current_user.get("user_id")),
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )


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

    return YoungPersonKeyworkService.return_keywork(
        conn,
        keywork_id=keywork_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )


@router.post("/keywork/{keywork_id}/archive")
@router.put("/keywork/{keywork_id}/archive")
def archive_keywork(
    keywork_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_keywork(conn, keywork_id, current_user)

    return YoungPersonKeyworkService.archive_keywork(
        conn,
        keywork_id=keywork_id,
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )
