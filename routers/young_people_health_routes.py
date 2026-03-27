from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_health_service import YoungPersonHealthService

router = APIRouter(prefix="/young-people", tags=["Young People Health"])


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


def _load_and_check_young_person(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    person = YoungPersonHealthService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_health_record(conn, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonHealthService.get_health_record(conn, record_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _load_and_check_medication_profile(conn, profile_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonHealthService.get_medication_profile(conn, profile_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _load_and_check_medication_record(conn, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonHealthService.get_medication_record(conn, record_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


class HealthProfileUpsertPayload(BaseModel):
    gp_name: str | None = None
    gp_contact: str | None = None
    dentist_name: str | None = None
    dentist_contact: str | None = None
    optician_name: str | None = None
    optician_contact: str | None = None
    allergies: str | None = None
    diagnoses: str | None = None
    mental_health_summary: str | None = None
    medication_summary: str | None = None
    consent_notes: str | None = None


class HealthRecordCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    record_type: str
    title: str
    summary: str | None = None
    professional_name: str | None = None
    outcome: str | None = None
    follow_up_required: bool | None = False
    next_action_date: str | None = None
    event_datetime: str | None = None
    created_by: int | None = None


class HealthRecordUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    record_type: str | None = None
    title: str | None = None
    summary: str | None = None
    professional_name: str | None = None
    outcome: str | None = None
    follow_up_required: bool | None = None
    next_action_date: str | None = None
    event_datetime: str | None = None
    created_by: int | None = None


class MedicationProfileCreatePayload(BaseModel):
    medication_name: str
    dosage: str | None = None
    route: str | None = None
    frequency: str | None = None
    prn_guidance: str | None = None
    prescribed_by: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_active: bool | None = True
    notes: str | None = None


class MedicationProfileUpdatePayload(BaseModel):
    medication_name: str | None = None
    dosage: str | None = None
    route: str | None = None
    frequency: str | None = None
    prn_guidance: str | None = None
    prescribed_by: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class MedicationRecordCreatePayload(BaseModel):
    medication_profile_id: int | None = None
    scheduled_time: str | None = None
    administered_time: str | None = None
    medication_name: str
    dose: str | None = None
    route: str | None = None
    status: str | None = None
    refusal_reason: str | None = None
    omission_reason: str | None = None
    error_flag: bool | None = False
    error_details: str | None = None
    manager_review_status: str | None = None
    administered_by: int | None = None


class MedicationRecordUpdatePayload(BaseModel):
    medication_profile_id: int | None = None
    scheduled_time: str | None = None
    administered_time: str | None = None
    medication_name: str | None = None
    dose: str | None = None
    route: str | None = None
    status: str | None = None
    refusal_reason: str | None = None
    omission_reason: str | None = None
    error_flag: bool | None = None
    error_details: str | None = None
    manager_review_status: str | None = None
    administered_by: int | None = None


@router.get("/{young_person_id}/health")
def get_young_person_health(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)
    return YoungPersonHealthService.get_health_bundle(conn, young_person_id)


@router.get("/health-records/{record_id}")
def get_health_record(
    record_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = _load_and_check_health_record(conn, record_id, current_user)
    return YoungPersonHealthService.transform_health_record(row)


@router.get("/medication-profiles/{profile_id}")
def get_medication_profile(
    profile_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = _load_and_check_medication_profile(conn, profile_id, current_user)
    return YoungPersonHealthService.transform_medication_profile(row)


@router.get("/medication-records/{record_id}")
def get_medication_record(
    record_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = _load_and_check_medication_record(conn, record_id, current_user)
    return YoungPersonHealthService.transform_medication_record(row)


@router.put("/{young_person_id}/health/profile")
def upsert_health_profile(
    young_person_id: int,
    payload: HealthProfileUpsertPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)

    row = YoungPersonHealthService.upsert_health_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
    )
    return {"ok": True, "health_profile": row}


@router.post("/{young_person_id}/health-records")
def create_health_record(
    young_person_id: int,
    payload: HealthRecordCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)

    return YoungPersonHealthService.create_health_record(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
        actor_user_id=_safe_int(current_user.get("user_id")),
        linking_service=YoungPeopleLinkingService,
    )


@router.patch("/health-records/{record_id}")
@router.put("/health-records/{record_id}")
def update_health_record(
    record_id: int,
    payload: HealthRecordUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_health_record(conn, record_id, current_user)

    return YoungPersonHealthService.update_health_record(
        conn,
        record_id=record_id,
        payload=payload.model_dump(exclude_unset=True),
    )


@router.post("/{young_person_id}/medication-profiles")
def create_medication_profile(
    young_person_id: int,
    payload: MedicationProfileCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)

    return YoungPersonHealthService.create_medication_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
    )


@router.patch("/medication-profiles/{profile_id}")
@router.put("/medication-profiles/{profile_id}")
def update_medication_profile(
    profile_id: int,
    payload: MedicationProfileUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_medication_profile(conn, profile_id, current_user)

    return YoungPersonHealthService.update_medication_profile(
        conn,
        profile_id=profile_id,
        payload=payload.model_dump(exclude_unset=True),
    )


@router.post("/{young_person_id}/medication-records")
def create_medication_record(
    young_person_id: int,
    payload: MedicationRecordCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)

    return YoungPersonHealthService.create_medication_record(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
    )


@router.patch("/medication-records/{record_id}")
@router.put("/medication-records/{record_id}")
def update_medication_record(
    record_id: int,
    payload: MedicationRecordUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_medication_record(conn, record_id, current_user)

    return YoungPersonHealthService.update_medication_record(
        conn,
        record_id=record_id,
        payload=payload.model_dump(exclude_unset=True),
    )
