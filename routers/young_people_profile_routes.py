from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Profile"])


PROVIDER_ROLES = {
    "admin",
    "administrator",
    "super_admin",
    "superadmin",
    "provider_admin",
    "ri",
    "responsible_individual",
}

HOME_ROLES = {
    "manager",
    "registered_manager",
    "deputy_manager",
    "staff",
    "rsw",
    "residential_support_worker",
}


EDIT_ROLES = PROVIDER_ROLES | HOME_ROLES


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        return int(value)
    except Exception:
        return None


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _user_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id") or current_user.get("homeId"))


def _user_provider_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("provider_id") or current_user.get("providerId"))


def _is_provider_role(current_user: dict[str, Any]) -> bool:
    return _user_role(current_user) in PROVIDER_ROLES


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    if _user_role(current_user) not in EDIT_ROLES:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")


def _assert_young_person_access(
    current_user: dict[str, Any],
    record: dict[str, Any],
) -> None:
    if _is_provider_role(current_user):
        user_provider_id = _user_provider_id(current_user)
        record_provider_id = _safe_int(record.get("provider_id"))

        if user_provider_id and record_provider_id and user_provider_id != record_provider_id:
            raise HTTPException(status_code=403, detail="You do not have access to this provider record")

        return

    user_home_id = _user_home_id(current_user)
    record_home_id = _safe_int(record.get("home_id"))

    if not user_home_id or not record_home_id:
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

    _assert_young_person_access(current_user, record)
    return record


def _scoped_list_filters(current_user: dict[str, Any]) -> tuple[int | None, int | None]:
    if _is_provider_role(current_user):
        return None, _user_provider_id(current_user)

    return _user_home_id(current_user), None


class YoungPersonCreatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    home_id: int = Field(..., gt=0)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(default="Unknown")
    preferred_name: str | None = None
    date_of_birth: str
    gender: str | None = None
    ethnicity: str | None = None
    nhs_number: str | None = None
    local_id_number: str | None = None
    admission_date: str
    discharge_date: str | None = None
    placement_status: str | None = "active"
    primary_keyworker_id: int | None = None
    summary_risk_level: str | None = None
    photo_url: str | None = None
    archived: bool | None = False


class YoungPersonUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

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
    model_config = ConfigDict(extra="ignore")

    neurodiversity_summary: str | None = None
    communication_style: str | None = None
    sensory_profile: str | None = None
    processing_needs: str | None = None
    signs_of_distress: str | None = None
    what_helps: str | None = None
    what_to_avoid: str | None = None
    routines_and_predictability: str | None = None
    visual_support_needs: str | None = None


class IdentityProfilePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    religion_or_faith: str | None = None
    cultural_identity: str | None = None
    first_language: str | None = None
    dietary_needs: str | None = None
    interests: str | None = None
    strengths_summary: str | None = None
    what_matters_to_me: str | None = None
    important_dates: str | None = None


class EducationProfilePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

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
    model_config = ConfigDict(extra="ignore")

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


class LegalStatusPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    legal_status: str | None = None
    order_type: str | None = None
    order_details: str | None = None
    restrictions_text: str | None = None
    delegated_authority_details: str | None = None
    consent_arrangements: str | None = None
    effective_from: str
    effective_to: str | None = None
    is_current: bool | None = True


class FormulationPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    presenting_needs: str | None = None
    developmental_context: str | None = None
    trauma_context: str | None = None
    neurodevelopmental_context: str | None = None
    relational_context: str | None = None
    meaning_of_behaviour: str | None = None
    known_triggers: str | None = None
    early_signs_of_distress: str | None = None
    protective_factors: str | None = None
    what_helps: str | None = None
    what_adults_should_avoid: str | None = None
    regulation_strategies: str | None = None
    child_voice_summary: str | None = None
    review_date: str | None = None
    is_current: bool | None = True


class ContactCreatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    contact_type: str | None = "family"
    full_name: str = Field(..., min_length=1)
    relationship_to_young_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_parental_responsibility_holder: bool | None = False
    is_approved_contact: bool | None = False
    is_restricted_contact: bool | None = False
    supervision_level: str | None = None
    notes: str | None = None


class ContactUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

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
    model_config = ConfigDict(extra="ignore")

    alert_type: str | None = "general"
    title: str = Field(..., min_length=1)
    description: str | None = None
    severity: str | None = "medium"
    review_date: str | None = None
    is_active: bool | None = True
    show_globally: bool | None = True


@router.get("")
def list_young_people(
    search: str | None = Query(default=""),
    include_archived: bool = Query(default=False),
    sort_by: str = Query(default="last_name"),
    sort_dir: str = Query(default="asc"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
):
    home_id, provider_id = _scoped_list_filters(current_user)

    try:
        rows = YoungPersonService.list_young_people(
            home_id=home_id,
            provider_id=provider_id,
            include_archived=include_archived,
            search=search or "",
            sort_by=sort_by,
            sort_dir=sort_dir,
            limit=limit,
            offset=offset,
        )
        return {"ok": True, "young_people": rows, "items": rows, "count": len(rows)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load young people: {str(e)}")


@router.post("")
def create_young_person(
    payload: YoungPersonCreatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)

    requested_home_id = _safe_int(payload.home_id)

    if not _is_provider_role(current_user):
        user_home_id = _user_home_id(current_user)
        if requested_home_id != user_home_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to create a young person in this home",
            )

    data = payload.model_dump(exclude_none=True)
    if _is_provider_role(current_user):
        data["provider_id"] = _user_provider_id(current_user)

    try:
        row = YoungPersonService.create_young_person(data)
        return {"ok": True, "young_person": row}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create young person: {str(e)}")


@router.get("/{young_person_id}")
def get_young_person(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    try:
        record = _load_and_check_young_person(young_person_id, current_user)
        bundle = YoungPersonService.get_full_profile_bundle(young_person_id)

        return {
            "ok": True,
            "young_person": (bundle or {}).get("young_person") or record,
            "bundle": bundle or {"young_person": record},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load young person: {str(e)}")


@router.patch("/{young_person_id}")
@router.put("/{young_person_id}")
def update_young_person(
    young_person_id: int,
    payload: YoungPersonUpdatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    existing = _load_and_check_young_person(young_person_id, current_user)

    update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if "home_id" in update_data and not _is_provider_role(current_user):
        requested_home_id = _safe_int(update_data.get("home_id"))
        if requested_home_id != _safe_int(existing.get("home_id")):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to move this young person to another home",
            )

    try:
        row = YoungPersonService.update_young_person(young_person_id, update_data)
        if not row:
            raise HTTPException(status_code=404, detail="Young person not found")

        return {"ok": True, "young_person": row}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update young person: {str(e)}")


@router.get("/{young_person_id}/overview")
def get_young_person_overview(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    try:
        record = _load_and_check_young_person(young_person_id, current_user)
        return {
            "ok": True,
            "young_person": record,
            "dashboard_counts": YoungPersonService.get_dashboard_counts(young_person_id),
            "alerts": YoungPersonService.get_active_alerts(young_person_id),
            "recent_activity": YoungPersonService.get_recent_activity(young_person_id, limit=12),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load overview: {str(e)}")


@router.get("/{young_person_id}/contacts")
def list_young_person_contacts(
    young_person_id: int,
    current_user=Depends(get_current_user),
):
    try:
        _load_and_check_young_person(young_person_id, current_user)
        rows = YoungPersonService.list_contacts(young_person_id)
        return {"ok": True, "items": rows, "contacts": rows, "count": len(rows)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load contacts: {str(e)}")


@router.post("/{young_person_id}/contacts")
def create_young_person_contact(
    young_person_id: int,
    payload: ContactCreatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        row = YoungPersonService.create_contact(
            young_person_id,
            payload.model_dump(exclude_none=True),
        )
        return {"ok": True, "contact": row}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create contact: {str(e)}")


@router.patch("/contacts/{contact_id}")
@router.put("/contacts/{contact_id}")
def update_young_person_contact(
    contact_id: int,
    payload: ContactUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    c.*,
                    yp.home_id,
                    yp.provider_id
                FROM young_person_contacts c
                JOIN young_people yp ON yp.id = c.young_person_id
                WHERE c.id = %s
                LIMIT 1
                """,
                (contact_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Contact not found")

        _assert_young_person_access(current_user, dict(row))

        update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        updated = YoungPersonService.update_contact(contact_id, update_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Contact not found")

        return {"ok": True, "contact": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update contact: {str(e)}")


@router.post("/{young_person_id}/alerts")
def create_young_person_alert(
    young_person_id: int,
    payload: AlertCreatePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        data = payload.model_dump(exclude_none=True)
        data["created_by"] = _user_id(current_user)

        row = YoungPersonService.create_alert(young_person_id, data)
        return {"ok": True, "alert": row}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


def _get_section_response(
    young_person_id: int,
    current_user: dict[str, Any],
    section: str,
    response_key: str,
):
    _load_and_check_young_person(young_person_id, current_user)
    row = YoungPersonService.get_section(young_person_id, section)
    return {"ok": True, response_key: row or {}}


def _upsert_section_response(
    young_person_id: int,
    current_user: dict[str, Any],
    section: str,
    response_key: str,
    payload: BaseModel,
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    data = payload.model_dump(exclude_none=True)
    if section in {"legal_status", "formulation"}:
        data["created_by"] = _user_id(current_user)

    row = YoungPersonService.upsert_section(
        young_person_id=young_person_id,
        section=section,
        data=data,
    )
    return {"ok": True, response_key: row}


@router.get("/{young_person_id}/communication-profile")
def get_communication_profile_route(young_person_id: int, current_user=Depends(get_current_user)):
    return _get_section_response(young_person_id, current_user, "communication_profile", "communication_profile")


@router.put("/{young_person_id}/communication-profile")
def upsert_communication_profile_route(
    young_person_id: int,
    payload: CommunicationProfilePayload,
    current_user=Depends(get_current_user),
):
    return _upsert_section_response(young_person_id, current_user, "communication_profile", "communication_profile", payload)


@router.get("/{young_person_id}/identity-profile")
def get_identity_profile_route(young_person_id: int, current_user=Depends(get_current_user)):
    return _get_section_response(young_person_id, current_user, "identity_profile", "identity_profile")


@router.put("/{young_person_id}/identity-profile")
def upsert_identity_profile_route(
    young_person_id: int,
    payload: IdentityProfilePayload,
    current_user=Depends(get_current_user),
):
    return _upsert_section_response(young_person_id, current_user, "identity_profile", "identity_profile", payload)


@router.get("/{young_person_id}/education-profile")
def get_education_profile_route(young_person_id: int, current_user=Depends(get_current_user)):
    return _get_section_response(young_person_id, current_user, "education_profile", "education_profile")


def upsert_education_profile_route(
    young_person_id: int,
    payload: EducationProfilePayload,
    current_user=Depends(get_current_user),
):
    return _upsert_section_response(young_person_id, current_user, "education_profile", "education_profile", payload)


@router.get("/{young_person_id}/health-profile")
def get_health_profile_route(young_person_id: int, current_user=Depends(get_current_user)):
    return _get_section_response(young_person_id, current_user, "health_profile", "health_profile")


def upsert_health_profile_route(
    young_person_id: int,
    payload: HealthProfilePayload,
    current_user=Depends(get_current_user),
):
    return _upsert_section_response(young_person_id, current_user, "health_profile", "health_profile", payload)


@router.get("/{young_person_id}/legal-status")
def get_legal_status_route(young_person_id: int, current_user=Depends(get_current_user)):
    return _get_section_response(young_person_id, current_user, "legal_status", "legal_status")


@router.put("/{young_person_id}/legal-status")
def upsert_legal_status_route(
    young_person_id: int,
    payload: LegalStatusPayload,
    current_user=Depends(get_current_user),
):
    return _upsert_section_response(young_person_id, current_user, "legal_status", "legal_status", payload)


@router.get("/{young_person_id}/formulations")
def get_formulation_route(young_person_id: int, current_user=Depends(get_current_user)):
    return _get_section_response(young_person_id, current_user, "formulation", "formulation")


@router.put("/{young_person_id}/formulations")
def upsert_formulation_route(
    young_person_id: int,
    payload: FormulationPayload,
    current_user=Depends(get_current_user),
):
    return _upsert_section_response(young_person_id, current_user, "formulation", "formulation", payload)