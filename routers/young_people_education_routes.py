from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_education_service import YoungPersonEducationService

router = APIRouter(prefix="/young-people", tags=["Young People Education"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _actor_id(current_user: dict[str, Any]) -> int | None:
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


def _load_and_check_young_person(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    person = YoungPersonEducationService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_education_record(conn, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonEducationService.get_education_record_row(conn, record_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _link_education_profile_event(conn, *, row: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    actor = _actor_id(current_user)
    young_person_id = int(row.get("young_person_id"))
    title = "Education profile updated" if event_type == "updated" else "Education profile created"
    narrative = " ".join(str(row.get(key) or "") for key in ("school_name", "year_group", "education_status", "sen_status", "ehcp_details", "designated_teacher", "pep_status", "support_summary"))
    review_required = bool(row.get("ehcp_details") or row.get("pep_status") or row.get("support_summary"))
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=young_person_id,
        source_table="young_person_education_profile",
        source_id=int(row.get("id")),
        event_type=event_type,
        title=title,
        summary="Education profile details changed, including school, SEN/EHCP, PEP, attendance or support information where supplied.",
        narrative=narrative or "Education profile updated",
        category="education",
        subcategory="education_profile",
        significance="medium",
        owner_id=actor,
        created_by=actor,
        workflow={
            "link_chronology": True,
            "create_task": review_required,
            "manager_review": review_required,
            "safeguarding": False,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "education_update": narrative,
            "quality_standards": ["reg_8_education"],
            "standards_rationale": "Linked from education profile update",
            "evidence_strength": "medium",
        },
    )
    conn.commit()
    return workflow


class EducationProfileUpsertPayload(BaseModel):
    school_name: str | None = None
    year_group: str | None = None
    education_status: str | None = None
    sen_status: str | None = None
    ehcp_details: str | None = None
    designated_teacher: str | None = None
    attendance_baseline: float | None = None
    pep_status: str | None = None
    support_summary: str | None = None


class EducationRecordCreatePayload(BaseModel):
    record_date: str | None = None
    attendance_status: str | None = None
    provision_name: str | None = None
    behaviour_summary: str | None = None
    learning_engagement: str | None = None
    issue_raised: str | None = None
    action_taken: str | None = None
    professional_involved: str | None = None
    achievement_note: str | None = None
    created_by: int | None = None


class EducationRecordUpdatePayload(BaseModel):
    record_date: str | None = None
    attendance_status: str | None = None
    provision_name: str | None = None
    behaviour_summary: str | None = None
    learning_engagement: str | None = None
    issue_raised: str | None = None
    action_taken: str | None = None
    professional_involved: str | None = None
    achievement_note: str | None = None
    created_by: int | None = None


@router.get("/{young_person_id}/education")
def get_young_person_education(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    return YoungPersonEducationService.get_education_bundle(conn, young_person_id)


@router.get("/education-records/{record_id}")
def get_education_record(record_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_education_record(conn, record_id, current_user)
    return YoungPersonEducationService.get_education_record(conn, record_id)


@router.put("/{young_person_id}/education/profile")
@router.put("/{young_person_id}/education-profile")
def upsert_education_profile(young_person_id: int, payload: EducationProfileUpsertPayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    row = YoungPersonEducationService.upsert_education_profile(conn, young_person_id=young_person_id, payload=payload.model_dump(exclude_none=True))
    workflow = _link_education_profile_event(conn, row=row, event_type="updated", current_user=current_user)
    return {"ok": True, "education_profile": row, "workflow": workflow}


@router.post("/{young_person_id}/education-records")
def create_education_record(young_person_id: int, payload: EducationRecordCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    return YoungPersonEducationService.create_education_record(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
        actor_user_id=_actor_id(current_user),
        linking_service=YoungPeopleLinkingService(),
    )


@router.patch("/education-records/{record_id}")
@router.put("/education-records/{record_id}")
def update_education_record(record_id: int, payload: EducationRecordUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_education_record(conn, record_id, current_user)
    return YoungPersonEducationService.update_education_record(conn, record_id=record_id, payload=payload.model_dump(exclude_unset=True))
