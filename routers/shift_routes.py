from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from db.connection import get_db
from repositories.os_repository_utils import safe_int
from services.handover_service import HandoverService
from services.shift_service import ShiftService

router = APIRouter(tags=["Operational Shift Workflows"])


def _shift_service() -> ShiftService:
    return ShiftService()


def _handover_service() -> HandoverService:
    return HandoverService()


@router.get("/shifts")
def list_shifts(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().list_shifts(conn, current_user, home_id=home_id)


@router.get("/shifts/current")
def current_shift(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().current_shift_workspace(conn, current_user, home_id=home_id)


@router.post("/shifts/start")
def start_shift(
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().start_shift(conn, current_user, payload)


@router.post("/shifts/{shift_id}/join")
def join_shift(
    shift_id: str,
    payload: dict[str, Any] | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().join_shift(conn, current_user, shift_id, payload or {})


@router.post("/shifts/{shift_id}/lifecycle")
def record_lifecycle(
    shift_id: str,
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().update_lifecycle(conn, current_user, shift_id, payload)


@router.post("/shifts/{shift_id}/sign-off")
def sign_off_shift(
    shift_id: str,
    payload: dict[str, Any] | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    data = dict(payload or {})
    data["state"] = "shift_signed_off"
    return _shift_service().update_lifecycle(conn, current_user, shift_id, data)


@router.get("/handover/current")
def current_handover(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _handover_service().current_handover(conn, current_user, home_id=home_id)


@router.post("/handover/current/prepare")
def prepare_handover(
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _handover_service().prepare_handover(conn, current_user, payload)


@router.get("/handover/history")
def handover_history(
    home_id: int | None = None,
    limit: int = 20,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _handover_service().handover_history(conn, current_user, home_id=home_id, limit=limit)


@router.get("/operations/live-board")
def live_operational_board(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().live_board(conn, current_user, home_id=home_id)


@router.get("/staff/me")
def my_staff_workspace(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().staff_workspace(conn, current_user, staff_id=safe_int(current_user.get("user_id") or current_user.get("id")))


@router.get("/staff/{staff_id}")
def staff_operational_workspace(
    staff_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().staff_workspace(conn, current_user, staff_id=staff_id)


@router.get("/staff/{staff_id}/tasks")
def staff_tasks(
    staff_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    data = _shift_service().staff_workspace(conn, current_user, staff_id=staff_id)
    return {"ok": True, "items": data.get("outstanding_tasks", []), "queues": data.get("queues", {})}


@router.get("/staff/{staff_id}/recording")
def staff_recording(
    staff_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    data = _shift_service().staff_workspace(conn, current_user, staff_id=staff_id)
    return {
        "ok": True,
        "recording_due": data.get("recording_due", []),
        "awaiting_review": (data.get("queues") or {}).get("awaiting_review", []),
        "chronology_requiring_attention": data.get("chronology_requiring_attention", []),
    }


@router.get("/staff/{staff_id}/handover")
def staff_handover(
    staff_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    data = _shift_service().staff_workspace(conn, current_user, staff_id=staff_id)
    return {"ok": True, "handover_actions": data.get("handover_actions", [])}


@router.post("/recording/quick")
def quick_record(
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().quick_record(conn, current_user, payload)


@router.get("/safeguarding/escalations")
def safeguarding_escalations(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().safeguarding_escalations(conn, current_user, home_id=home_id)


@router.post("/safeguarding/escalations")
def safeguarding_escalation_decision(
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    # Operational guardrail: this endpoint records a review state only; it never makes a safeguarding conclusion.
    return {
        "ok": True,
        "review_state": payload.get("review_state") or "review_required",
        "language_guardrail": "Records indicate / evidence suggests / review required. No automatic safeguarding conclusion made.",
        "next_actions": payload.get("next_actions") or ["manager review", "evidence gathering", "chronology update"],
    }


@router.get("/qa/operational")
def operational_qa(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _shift_service().qa_workspace(conn, current_user, home_id=home_id)


@router.post("/qa/operational/{item_id}/review")
def review_qa_item(
    item_id: str,
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    item = _shift_service().repository.review_qa_item(conn, current_user, item_id, payload)
    return {"ok": True, "item": item}
