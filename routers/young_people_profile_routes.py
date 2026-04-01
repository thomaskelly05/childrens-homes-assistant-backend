from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Profile"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
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
    model_config = ConfigDict(extra="ignore")

    home_id: int
    first_name: str
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

    communication_style: str | None = None
    sensory_profile: str | None = None
    processing_needs: str | None = None
    signs_of_distress: str | None = None
    what_helps: str | None = None
    what_to_avoid: str | None = None


class IdentityProfilePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    religion_or_faith: str | None = None
    cultural_identity: str | None = None
    first_language: str | None = None
    dietary_needs: str | None = None
    interests: str | None = None
    strengths_summary: str | None = None
    what_matters_to_me: str | None = None


class LegalStatusPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    legal_status: str | None = None
    order_type: str | None = None
    restrictions_text: str | None = None
    delegated_authority_details: str | None = None
    consent_arrangements: str | None = None
    effective_from: str | None = None
    effective_to: str | None = None
    is_current: bool | None = True
    created_by: int | None = None


class ContactCreatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    contact_type: str | None = None
    full_name: str
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

    alert_type: str | None = None
    title: str
    description: str | None = None
    severity: str | None = "medium"
    review_date: str | None = None
    is_active: bool | None = True
    created_by: int | None = None


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
    role = _user_role(current_user)
    home_id = None if role in {"admin", "provider_admin"} else _user_home_id(current_user)

    try:
        rows = YoungPersonService.list_young_people(
            home_id=home_id,
            include_archived=include_archived,
            search=search or "",
            sort_by=sort_by,
            sort_dir=sort_dir,
            limit=limit,
            offset=offset,
        )
        return {
            "young_people": rows,
            "items": rows,
            "count": len(rows),
        }
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
    user_home_id = _user_home_id(current_user)
    role = _user_role(current_user)

    if role not in {"admin", "provider_admin"} and requested_home_id != user_home_id:
        raise HTTPException(status_code=403, detail="You do not have permission to create a young person in this home")

    try:
        row = YoungPersonService.create_young_person(payload.model_dump(exclude_none=True))
        return {
            "ok": True,
            "young_person": row,
        }
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

        if not bundle:
            return {
                "ok": True,
                "young_person": record,
                "bundle": {"young_person": record},
            }

        return {
            "ok": True,
            "young_person": bundle.get("young_person") or record,
            "bundle": bundle,
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

    update_data = payload.model_dump(exclude_unset=True)

    if "home_id" in update_data:
        requested_home_id = _safe_int(update_data.get("home_id"))
        role = _user_role(current_user)
        if role not in {"admin", "provider_admin"} and requested_home_id != _safe_int(existing.get("home_id")):
            raise HTTPException(status_code=403, detail="You do not have permission to move this young person to another home")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    try:
        row = YoungPersonService.update_young_person(young_person_id, update_data)
        if not row:
            raise HTTPException(status_code=404, detail="Young person not found")

        return {
            "ok": True,
            "young_person": row,
        }
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
        alerts = YoungPersonService.get_active_alerts(young_person_id)
        dashboard_counts = YoungPersonService.get_dashboard_counts(young_person_id)
        recent_activity = YoungPersonService.get_recent_activity(young_person_id, limit=12)

        return {
            "ok": True,
            "young_person": record,
            "dashboard_counts": dashboard_counts,
            "alerts": alerts,
            "recent_activity": recent_activity,
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
        return {
            "items": rows,
            "count": len(rows),
        }
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
        return {
            "ok": True,
            "contact": row,
        }
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
                    yp.home_id
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

        _assert_home_access(current_user, _safe_int(row.get("home_id")))

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        updated = YoungPersonService.update_contact(contact_id, update_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Contact not found")

        return {
            "ok": True,
            "contact": updated,
        }
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
        actor_user_id = _safe_int(current_user.get("user_id"))
        alert_data = payload.model_dump(exclude_none=True)
        if not alert_data.get("created_by"):
            alert_data["created_by"] = actor_user_id

        row = YoungPersonService.create_alert(young_person_id, alert_data)
        return {
            "ok": True,
            "alert": row,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


@router.put("/{young_person_id}/communication-profile")
def upsert_communication_profile_route(
    young_person_id: int,
    payload: CommunicationProfilePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        row = YoungPersonService.upsert_section(
            young_person_id=young_person_id,
            section="communication_profile",
            data=payload.model_dump(exclude_none=True),
        )
        return {
            "ok": True,
            "communication_profile": row,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save communication profile: {str(e)}")


@router.put("/{young_person_id}/identity-profile")
def upsert_identity_profile_route(
    young_person_id: int,
    payload: IdentityProfilePayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        row = YoungPersonService.upsert_section(
            young_person_id=young_person_id,
            section="identity_profile",
            data=payload.model_dump(exclude_none=True),
        )
        return {
            "ok": True,
            "identity_profile": row,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save identity profile: {str(e)}")


@router.put("/{young_person_id}/legal-status")
def upsert_legal_status_route(
    young_person_id: int,
    payload: LegalStatusPayload,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        actor_user_id = _safe_int(current_user.get("user_id"))
        data = payload.model_dump(exclude_none=True)
        if not data.get("created_by"):
            data["created_by"] = actor_user_id

        row = YoungPersonService.upsert_section(
            young_person_id=young_person_id,
            section="legal_status",
            data=data,
        )
        return {
            "ok": True,
            "legal_status": row,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save legal status: {str(e)}")
