from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.current_user import get_current_user
from services.young_person_service import YoungPersonService
from services.young_people_chronology_service import get_young_person_timeline

router = APIRouter(prefix="/young-people", tags=["Young People Chronology"])


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


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


@router.get("/{young_person_id}/timeline")
def list_young_person_timeline(
    young_person_id: int,
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    record_type: str = Query(""),
    search: str = Query(""),
    limit: int = Query(250, ge=1, le=1000),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        rows = get_young_person_timeline(
            young_person_id=young_person_id,
            date_from=date_from,
            date_to=date_to,
            record_type=record_type,
            search=search,
            limit=limit,
        )

        return {
            "timeline": rows,
            "items": rows,
            "count": len(rows),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load timeline: {str(e)}")
