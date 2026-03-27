from __future__ import annotations

import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from services.young_person_service import YoungPersonService
from services.young_people_timeline_service import get_young_person_timeline

logger = logging.getLogger("indicare.young_people_profile_routes")

router = APIRouter(prefix="/young-people", tags=["Young People"])


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


def _assert_can_manage_contacts_and_alerts(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission for this action")


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


class YoungPersonCreatePayload(BaseModel):
    home_id: int | None = None
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
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


class YoungPersonUpdatePayload(BaseModel):
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
    neurodiversity_summary: str | None = None
    communication_style: str | None = None
    sensory_profile: str | None = None
    processing_needs: str | None = None
    signs_of_distress: str | None = None
    what_helps: str | None = None
    what_to_avoid: str | None = None
    routines_and_predictability: str | None = None
    visual_support_needs: str | None = None


class EducationProfilePayload(BaseModel):
    school_name: str | None = None
    year_group: str | None = None
    education_status: str | None = None
    sen_status: str | None = None
    ehcp_details: str | None = None
    designated_teacher: str | None = None
    attendance_baseline: float | None = None
    pep_status: str | None = None
    support_summary: str | None = None


class HealthProfilePayload(BaseModel):
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


class IdentityProfilePayload(BaseModel):
    religion_or_faith: str | None = None
    cultural_identity: str | None = None
    first_language: str | None = None
    dietary_needs: str | None = None
    interests: str | None = None
    strengths_summary: str | None = None
    what_matters_to_me: str | None = None
    important_dates: str | None = None


class LegalStatusPayload(BaseModel):
    legal_status: str | None = None
    order_type: str | None = None
    order_details: str | None = None
    delegated_authority_details: str | None = None
    restrictions_text: str | None = None
    consent_arrangements: str | None = None
    effective_from: str | None = None
    effective_to: str | None = None
    is_current: bool | None = None
    created_by: int | None = None


class ContactCreatePayload(BaseModel):
    contact_type: str | None = None
    full_name: str = Field(min_length=1, max_length=200)
    relationship_to_young_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_parental_responsibility_holder: bool | None = None
    is_approved_contact: bool | None = None
    is_restricted_contact: bool | None = None
    supervision_level: str | None = None
    notes: str | None = None


class ContactUpdatePayload(BaseModel):
    contact_type: str | None = None
    full_name: str | None = None
    relationship_to_young_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_parental_responsibility_holder: bool | None = None
    is_approved_contact: bool | None = None
    is_restricted_contact: bool | None = None
    supervision_level: str | None = None
    notes: str | None = None


class AlertCreatePayload(BaseModel):
    alert_type: str | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    severity: str | None = None
    is_active: bool | None = None
    show_globally: bool | None = None
    review_date: str | None = None


@router.get("")
def list_young_people(
    q: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    include_archived: bool = Query(default=False),
    sort_by: str = Query(default="last_name"),
    sort_dir: str = Query(default="asc"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
):
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    effective_home_id = home_id
    if role not in {"admin", "provider_admin"}:
        effective_home_id = user_home_id

    rows = YoungPersonService.list_young_people(
        home_id=effective_home_id,
        search=q,
        include_archived=include_archived,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
        offset=offset,
    )

    return {"young_people": rows, "count": len(rows)}


@router.post("")
def create_young_person(
    payload: YoungPersonCreatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)

    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    data = payload.model_dump(exclude_none=True)

    if role not in {"admin", "provider_admin"}:
        if user_home_id is None:
            raise HTTPException(status_code=400, detail="Your account is not linked to a home")
        data["home_id"] = user_home_id
    elif not data.get("home_id"):
        raise HTTPException(status_code=400, detail="home_id is required")

    try:
        row = YoungPersonService.create_young_person(data)
        return {"ok": True, "young_person": row}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{young_person_id}")
def get_young_person_bundle(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    record = _load_and_check_young_person(young_person_id, current_user)
    bundle = YoungPersonService.get_full_profile_bundle(young_person_id)

    if not bundle:
        raise HTTPException(status_code=404, detail="Young person not found")

    return {
        "ok": True,
        "young_person_id": young_person_id,
        "bundle": bundle,
        "young_person": record,
    }


@router.patch("/{young_person_id}")
def update_young_person(
    young_person_id: int,
    payload: YoungPersonUpdatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        row = YoungPersonService.update_young_person(
            young_person_id,
            payload.model_dump(exclude_none=True),
        )
        return {"ok": True, "young_person": row}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{young_person_id}/overview")
def get_young_person_overview(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    return {
        "ok": True,
        "young_person": YoungPersonService.get_young_person_by_id(young_person_id),
        "dashboard_counts": YoungPersonService.get_dashboard_counts(young_person_id),
        "recent_activity": YoungPersonService.get_recent_activity(young_person_id, limit=20),
        "alerts": YoungPersonService.get_active_alerts(young_person_id),
    }


@router.get("/{young_person_id}/timeline")
def get_timeline(
    young_person_id: int,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    record_type: str = Query(default=""),
    search: str = Query(default=""),
    limit: int = Query(default=250, ge=1, le=1000),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    rows = get_young_person_timeline(
        young_person_id=young_person_id,
        date_from=date_from,
        date_to=date_to,
        record_type=record_type,
        search=search,
        limit=limit,
    )

    return {
        "ok": True,
        "timeline": rows,
        "count": len(rows),
    }


@router.get("/{young_person_id}/communication-profile")
def get_communication_profile(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)
    return {
        "ok": True,
        "communication_profile": YoungPersonService.get_section(young_person_id, "communication_profile"),
    }


@router.put("/{young_person_id}/communication-profile")
def upsert_communication_profile(
    young_person_id: int,
    payload: CommunicationProfilePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    row = YoungPersonService.upsert_section(
        young_person_id=young_person_id,
        section="communication_profile",
        data=payload.model_dump(exclude_none=True),
    )
    return {"ok": True, "communication_profile": row}


@router.get("/{young_person_id}/education-profile")
def get_education_profile(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)
    return {
        "ok": True,
        "education_profile": YoungPersonService.get_section(young_person_id, "education_profile"),
    }


@router.put("/{young_person_id}/education-profile")
def upsert_education_profile(
    young_person_id: int,
    payload: EducationProfilePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    row = YoungPersonService.upsert_section(
        young_person_id=young_person_id,
        section="education_profile",
        data=payload.model_dump(exclude_none=True),
    )
    return {"ok": True, "education_profile": row}


@router.get("/{young_person_id}/health-profile")
def get_health_profile(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)
    return {
        "ok": True,
        "health_profile": YoungPersonService.get_section(young_person_id, "health_profile"),
    }


@router.put("/{young_person_id}/health-profile")
def upsert_health_profile(
    young_person_id: int,
    payload: HealthProfilePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    row = YoungPersonService.upsert_section(
        young_person_id=young_person_id,
        section="health_profile",
        data=payload.model_dump(exclude_none=True),
    )
    return {"ok": True, "health_profile": row}


@router.get("/{young_person_id}/identity-profile")
def get_identity_profile(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)
    return {
        "ok": True,
        "identity_profile": YoungPersonService.get_section(young_person_id, "identity_profile"),
    }


@router.put("/{young_person_id}/identity-profile")
def upsert_identity_profile(
    young_person_id: int,
    payload: IdentityProfilePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    row = YoungPersonService.upsert_section(
        young_person_id=young_person_id,
        section="identity_profile",
        data=payload.model_dump(exclude_none=True),
    )
    return {"ok": True, "identity_profile": row}


@router.get("/{young_person_id}/legal-status")
def get_legal_status(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)
    return {
        "ok": True,
        "legal_status": YoungPersonService.get_section(young_person_id, "legal_status"),
    }


@router.put("/{young_person_id}/legal-status")
def upsert_legal_status(
    young_person_id: int,
    payload: LegalStatusPayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    data = payload.model_dump(exclude_none=True)
    if "created_by" not in data:
        data["created_by"] = _safe_int(current_user.get("user_id"))

    row = YoungPersonService.upsert_section(
        young_person_id=young_person_id,
        section="legal_status",
        data=data,
    )
    return {"ok": True, "legal_status": row}


@router.get("/{young_person_id}/contacts")
def list_contacts(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)
    rows = YoungPersonService.list_contacts(young_person_id)
    return {"ok": True, "contacts": rows, "count": len(rows)}


@router.post("/{young_person_id}/contacts")
def create_contact(
    young_person_id: int,
    payload: ContactCreatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_manage_contacts_and_alerts(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        row = YoungPersonService.create_contact(
            young_person_id,
            payload.model_dump(exclude_none=True),
        )
        return {"ok": True, "contact": row}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/contacts/{contact_id}")
def update_contact(
    contact_id: int,
    payload: ContactUpdatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_manage_contacts_and_alerts(current_user)

    row = YoungPersonService.update_contact(
        contact_id,
        payload.model_dump(exclude_none=True),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")

    parent = YoungPersonService.get_young_person_by_id(_safe_int(row.get("young_person_id")) or 0)
    if not parent:
        raise HTTPException(status_code=404, detail="Related young person not found")

    _assert_home_access(current_user, _safe_int(parent.get("home_id")))

    return {"ok": True, "contact": row}


@router.get("/{young_person_id}/alerts")
def list_alerts(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)
    rows = YoungPersonService.get_active_alerts(young_person_id)
    return {"ok": True, "alerts": rows, "count": len(rows)}


@router.post("/{young_person_id}/alerts")
def create_alert(
    young_person_id: int,
    payload: AlertCreatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_manage_contacts_and_alerts(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    data = payload.model_dump(exclude_none=True)
    data["created_by"] = _safe_int(current_user.get("user_id"))

    try:
        row = YoungPersonService.create_alert(young_person_id, data)
        return {"ok": True, "alert": row}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
