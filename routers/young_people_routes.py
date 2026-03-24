from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_people_service import (
    add_alert,
    add_contact,
    create_young_person,
    get_young_person_by_id,
    get_young_person_overview,
    list_young_people,
    update_young_person,
    upsert_communication_profile,
    upsert_education_profile,
    upsert_health_profile,
    upsert_identity_profile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/young-people", tags=["Young People"])
compat_router = APIRouter(tags=["Young People Compatibility"])


class YoungPersonCreatePayload(BaseModel):
    home_id: int
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str | None = ""
    preferred_name: str | None = ""
    date_of_birth: str | None = None
    gender: str | None = ""
    ethnicity: str | None = ""
    nhs_number: str | None = ""
    local_id_number: str | None = ""
    admission_date: str | None = None
    discharge_date: str | None = None
    placement_status: str | None = ""
    primary_keyworker_id: int | None = None
    summary_risk_level: str | None = ""
    photo_url: str | None = ""
    archived: bool = False


class YoungPersonUpdatePayload(BaseModel):
    home_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    preferred_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    ethnicity: str | None = None
    nhs_number: str | None = None
    local_id_number: str | None = None
    admission_date: str | None = None
    discharge_date: str | None = None
    placement_status: str | None = None
    primary_keyworker_id: int | None = None
    summary_risk_level: str | None = None
    photo_url: str | None = None
    archived: bool | None = None


class CommunicationProfilePayload(BaseModel):
    neurodiversity_summary: str | None = ""
    communication_style: str | None = ""
    sensory_profile: str | None = ""
    processing_needs: str | None = ""
    signs_of_distress: str | None = ""
    what_helps: str | None = ""
    what_to_avoid: str | None = ""
    routines_and_predictability: str | None = ""
    visual_support_needs: str | None = ""


class EducationProfilePayload(BaseModel):
    school_name: str | None = ""
    year_group: str | None = ""
    education_status: str | None = ""
    sen_status: str | None = ""
    ehcp_details: str | None = ""
    designated_teacher: str | None = ""
    attendance_baseline: float | None = None
    pep_status: str | None = ""
    support_summary: str | None = ""


class HealthProfilePayload(BaseModel):
    gp_name: str | None = ""
    gp_contact: str | None = ""
    dentist_name: str | None = ""
    dentist_contact: str | None = ""
    optician_name: str | None = ""
    optician_contact: str | None = ""
    allergies: str | None = ""
    diagnoses: str | None = ""
    mental_health_summary: str | None = ""
    medication_summary: str | None = ""
    consent_notes: str | None = ""


class IdentityProfilePayload(BaseModel):
    religion_or_faith: str | None = ""
    cultural_identity: str | None = ""
    first_language: str | None = ""
    dietary_needs: str | None = ""
    interests: str | None = ""
    strengths_summary: str | None = ""
    what_matters_to_me: str | None = ""
    important_dates: str | None = ""


class ContactPayload(BaseModel):
    contact_type: str | None = ""
    full_name: str = Field(min_length=1, max_length=200)
    relationship_to_young_person: str | None = ""
    phone: str | None = ""
    email: str | None = ""
    address: str | None = ""
    is_parental_responsibility_holder: bool = False
    is_approved_contact: bool = False
    is_restricted_contact: bool = False
    supervision_level: str | None = ""
    notes: str | None = ""


class AlertPayload(BaseModel):
    alert_type: str | None = ""
    title: str = Field(min_length=1, max_length=200)
    description: str | None = ""
    severity: str | None = ""
    is_active: bool = True
    show_globally: bool = False
    review_date: str | None = None


def _current_user_id(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("user_id") or current_user.get("id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _current_home_id(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("home_id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _current_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _can_access_home(current_user: dict[str, Any], target_home_id: int | None) -> bool:
    role = _current_role(current_user)
    user_home_id = _current_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return True

    if target_home_id is None:
        return False

    return user_home_id == target_home_id


def _get_person_or_404(conn, young_person_id: int) -> dict[str, Any]:
    person = get_young_person_by_id(conn, young_person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Young person not found")
    return person


def _check_person_access(conn, current_user: dict[str, Any], young_person_id: int) -> dict[str, Any]:
    person = _get_person_or_404(conn, young_person_id)
    if not _can_access_home(current_user, person.get("home_id")):
        raise HTTPException(status_code=403, detail="Not authorised for this young person")
    return person


@router.get("")
@router.get("/")
def get_young_people(
    home_id: int | None = Query(default=None),
    include_archived: bool = Query(default=False),
    search: str = Query(default=""),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    requested_home_id = home_id

    if _current_role(current_user) not in {"admin", "provider_admin"}:
        requested_home_id = _current_home_id(current_user)

    rows = list_young_people(
        conn,
        home_id=requested_home_id,
        include_archived=include_archived,
        search=search,
    )
    return {"young_people": rows}


@router.get("/overview")
def get_my_home_young_people_overview(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    home_id = _current_home_id(current_user)
    if home_id is None and _current_role(current_user) not in {"admin", "provider_admin"}:
        raise HTTPException(status_code=400, detail="No home linked to current user")

    rows = list_young_people(
        conn,
        home_id=home_id,
        include_archived=False,
        search="",
    )
    return {"young_people": rows, "count": len(rows)}


@router.get("/{young_person_id}")
def get_young_person(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    person = _check_person_access(conn, current_user, young_person_id)
    return {"young_person": person}


@router.get("/{young_person_id}/overview")
def get_young_person_full_overview(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_person_access(conn, current_user, young_person_id)
    overview = get_young_person_overview(conn, young_person_id)
    return {"overview": overview}


@router.post("")
@router.post("/")
def create_new_young_person(
    payload: YoungPersonCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not _can_access_home(current_user, payload.home_id):
        raise HTTPException(status_code=403, detail="Not authorised to create for this home")

    created = create_young_person(
        conn,
        home_id=payload.home_id,
        first_name=payload.first_name,
        last_name=payload.last_name or "",
        preferred_name=payload.preferred_name or "",
        date_of_birth=payload.date_of_birth,
        gender=payload.gender or "",
        ethnicity=payload.ethnicity or "",
        nhs_number=payload.nhs_number or "",
        local_id_number=payload.local_id_number or "",
        admission_date=payload.admission_date,
        discharge_date=payload.discharge_date,
        placement_status=payload.placement_status or "",
        primary_keyworker_id=payload.primary_keyworker_id,
        summary_risk_level=payload.summary_risk_level or "",
        photo_url=payload.photo_url or "",
        archived=payload.archived,
    )
    return {"ok": True, "young_person": created}


@router.patch("/{young_person_id}")
def update_existing_young_person(
    young_person_id: int,
    payload: YoungPersonUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    person = _check_person_access(conn, current_user, young_person_id)

    if payload.home_id is not None and not _can_access_home(current_user, payload.home_id):
        raise HTTPException(status_code=403, detail="Not authorised to move this young person to that home")

    updated = update_young_person(
        conn,
        young_person_id,
        payload.model_dump(exclude_unset=True),
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Young person not found")

    return {"ok": True, "young_person": updated, "previous_home_id": person.get("home_id")}


@router.put("/{young_person_id}/communication-profile")
def save_communication_profile(
    young_person_id: int,
    payload: CommunicationProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_person_access(conn, current_user, young_person_id)
    row = upsert_communication_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "communication_profile": row}


@router.put("/{young_person_id}/education-profile")
def save_education_profile(
    young_person_id: int,
    payload: EducationProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_person_access(conn, current_user, young_person_id)
    row = upsert_education_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "education_profile": row}


@router.put("/{young_person_id}/health-profile")
def save_health_profile(
    young_person_id: int,
    payload: HealthProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_person_access(conn, current_user, young_person_id)
    row = upsert_health_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "health_profile": row}


@router.put("/{young_person_id}/identity-profile")
def save_identity_profile(
    young_person_id: int,
    payload: IdentityProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_person_access(conn, current_user, young_person_id)
    row = upsert_identity_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "identity_profile": row}


@router.post("/{young_person_id}/contacts")
def create_contact(
    young_person_id: int,
    payload: ContactPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_person_access(conn, current_user, young_person_id)
    row = add_contact(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "contact": row}


@router.post("/{young_person_id}/alerts")
def create_alert(
    young_person_id: int,
    payload: AlertPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_person_access(conn, current_user, young_person_id)
    row = add_alert(
        conn,
        young_person_id=young_person_id,
        created_by=_current_user_id(current_user),
        payload=payload.model_dump(),
    )
    return {"ok": True, "alert": row}


@compat_router.get("/young-people")
def compat_get_young_people(
    home_id: int | None = Query(default=None),
    include_archived: bool = Query(default=False),
    search: str = Query(default=""),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_young_people(
        home_id=home_id,
        include_archived=include_archived,
        search=search,
        conn=conn,
        current_user=current_user,
    )


@compat_router.get("/young-people/{young_person_id}")
def compat_get_young_person(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_young_person(
        young_person_id=young_person_id,
        conn=conn,
        current_user=current_user,
    )


@compat_router.get("/young-people/{young_person_id}/overview")
def compat_get_young_person_overview(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_young_person_full_overview(
        young_person_id=young_person_id,
        conn=conn,
        current_user=current_user,
    )
