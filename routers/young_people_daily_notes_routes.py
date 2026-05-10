from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_daily_notes_service import YoungPersonDailyNotesService
from services.young_people_linking_service import YoungPeopleLinkingService

router = APIRouter(prefix="/young-people", tags=["Young People Daily Notes"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _current_user_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


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


def _load_and_check_young_person(
    conn,
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonDailyNotesService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _load_and_check_daily_note(
    conn,
    daily_note_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    row = YoungPersonDailyNotesService.fetch_daily_note_by_id(conn, daily_note_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _normalise_status(value: Any) -> str:
    value = str(value or "").strip().lower()
    return value or "draft"


class DailyNoteCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    home_id: int | None = None
    note_date: str
    shift_type: str

    status: str | None = "draft"
    workflow_status: str | None = "draft"

    mood: str | None = None
    presentation: str | None = None
    activities: str | None = None
    education_update: str | None = None
    health_update: str | None = None
    family_update: str | None = None
    behaviour_update: str | None = None
    young_person_voice: str | None = None
    positives: str | None = None
    actions_required: str | None = None
    significance: str | None = None

    manager_review_comment: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None
    returned_at: str | None = None
    submitted_at: str | None = None
    last_edited_at: str | None = None
    author_id: int | None = None

    child_voice: str | None = Field(default=None, alias="child_voice")
    recorded_at: str | None = Field(default=None, alias="recorded_at")
    narrative: str | None = Field(default=None, alias="narrative")
    title: str | None = None

    create_follow_up_task: bool = False
    link_to_chronology: bool = True
    link_to_support_plans: bool = False
    manager_review_needed: bool = False
    safeguarding_concern: bool = False
    link_monthly_reviews: bool = False
    link_quality_standards: bool = True


class DailyNoteUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    home_id: int | None = None
    note_date: str | None = None
    shift_type: str | None = None

    status: str | None = None
    workflow_status: str | None = None

    mood: str | None = None
    presentation: str | None = None
    activities: str | None = None
    education_update: str | None = None
    health_update: str | None = None
    family_update: str | None = None
    behaviour_update: str | None = None
    young_person_voice: str | None = None
    positives: str | None = None
    actions_required: str | None = None
    significance: str | None = None

    manager_review_comment: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None
    returned_at: str | None = None
    submitted_at: str | None = None
    last_edited_at: str | None = None
    author_id: int | None = None

    child_voice: str | None = Field(default=None, alias="child_voice")
    recorded_at: str | None = Field(default=None, alias="recorded_at")
    narrative: str | None = Field(default=None, alias="narrative")
    title: str | None = None


class ReviewDecisionPayload(BaseModel):
    review_note: str | None = None
    approved_by: int | None = None


@router.get("/{young_person_id}/daily-notes")
def list_daily_notes(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonDailyNotesService.list_daily_notes_for_young_person(
        conn,
        young_person_id=young_person_id,
        archived=False,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/{young_person_id}/daily-notes/archive")
def list_archived_daily_notes(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    rows = YoungPersonDailyNotesService.list_daily_notes_for_young_person(
        conn,
        young_person_id=young_person_id,
        archived=True,
    )
    return {"items": rows, "count": len(rows)}


@router.get("/daily-notes/{daily_note_id}")
def get_daily_note(
    daily_note_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_daily_note(conn, daily_note_id, current_user)
    return YoungPersonDailyNotesService.get_daily_note(conn, daily_note_id)


@router.post("/{young_person_id}/daily-notes")
def create_daily_note(
    young_person_id: int,
    payload: DailyNoteCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    person = _load_and_check_young_person(conn, young_person_id, current_user)

    data = payload.model_dump(exclude_none=True, by_alias=False)

    if "home_id" not in data or data["home_id"] is None:
        data["home_id"] = person.get("home_id")

    data["status"] = _normalise_status(data.get("status"))
    data["workflow_status"] = _normalise_status(
        data.get("workflow_status") or data.get("status")
    )

    return YoungPersonDailyNotesService.create_daily_note(
        conn,
        young_person_id=young_person_id,
        payload=data,
        author_id=_current_user_id(current_user),
        linking_service=YoungPeopleLinkingService,
    )


@router.patch("/daily-notes/{daily_note_id}")
def update_daily_note(
    daily_note_id: int,
    payload: DailyNoteUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_daily_note(conn, daily_note_id, current_user)

    data = payload.model_dump(exclude_unset=True, exclude_none=True, by_alias=False)

    if "status" in data:
        data["status"] = _normalise_status(data.get("status"))

    if "workflow_status" in data:
        data["workflow_status"] = _normalise_status(
            data.get("workflow_status") or data.get("status")
        )

    return YoungPersonDailyNotesService.update_daily_note(
        conn,
        daily_note_id=daily_note_id,
        payload=data,
    )


@router.post("/daily-notes/{daily_note_id}/submit")
def submit_daily_note(
    daily_note_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_daily_note(conn, daily_note_id, current_user)

    return YoungPersonDailyNotesService.submit_daily_note(
        conn,
        daily_note_id=daily_note_id,
        actor_user_id=_current_user_id(current_user),
        linking_service=YoungPeopleLinkingService,
    )


@router.post("/daily-notes/{daily_note_id}/approve")
def approve_daily_note(
    daily_note_id: int,
    payload: ReviewDecisionPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_daily_note(conn, daily_note_id, current_user)

    approved_by = payload.approved_by or _current_user_id(current_user)

    return YoungPersonDailyNotesService.approve_daily_note(
        conn,
        daily_note_id=daily_note_id,
        approved_by=approved_by,
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )


@router.post("/daily-notes/{daily_note_id}/return")
def return_daily_note(
    daily_note_id: int,
    payload: ReviewDecisionPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_daily_note(conn, daily_note_id, current_user)

    return YoungPersonDailyNotesService.return_daily_note(
        conn,
        daily_note_id=daily_note_id,
        actor_user_id=_current_user_id(current_user),
        review_note=payload.review_note,
        linking_service=YoungPeopleLinkingService,
    )


@router.post("/daily-notes/{daily_note_id}/archive")
def archive_daily_note(
    daily_note_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_daily_note(conn, daily_note_id, current_user)

    return YoungPersonDailyNotesService.archive_daily_note(
        conn,
        daily_note_id=daily_note_id,
        actor_user_id=_current_user_id(current_user),
        linking_service=YoungPeopleLinkingService,
    )
