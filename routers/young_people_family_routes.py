from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_family_service import YoungPersonFamilyService

router = APIRouter(prefix="/young-people", tags=["Young People Family"])


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
    person = YoungPersonFamilyService.ensure_young_person_exists(conn, young_person_id)
    _assert_home_access(current_user, _safe_int(person.get("home_id")))
    return person


def _load_and_check_contact(conn, contact_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonFamilyService.get_contact_row(conn, contact_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _load_and_check_family_record(conn, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    row = YoungPersonFamilyService.get_family_contact_record_row(conn, record_id)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _link_family_contact_profile_event(conn, *, row: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    actor = _actor_id(current_user)
    young_person_id = int(row.get("young_person_id"))
    name = row.get("full_name") or "Family/contact profile"
    restricted = bool(row.get("is_restricted_contact"))
    supervised = bool(row.get("supervision_level"))
    approved = bool(row.get("is_approved_contact"))
    requires_review = restricted or supervised or not approved
    title = f"Family contact profile {event_type}: {name}"
    summary = f"Family/contact profile {event_type} for {name}."
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=young_person_id,
        source_table="young_person_contacts",
        source_id=int(row.get("id")),
        event_type=event_type,
        title=title,
        summary=summary,
        narrative=" ".join(str(row.get(key) or "") for key in ("full_name", "relationship_to_young_person", "contact_type", "supervision_level", "notes")) or summary,
        category="family",
        subcategory="contact_profile",
        significance="high" if requires_review else "medium",
        owner_id=actor,
        created_by=actor,
        workflow={
            "link_chronology": True,
            "create_task": requires_review,
            "manager_review": requires_review,
            "safeguarding": restricted,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "family_update": summary,
            "restricted_contact": restricted,
            "supervision_level": row.get("supervision_level"),
            "approved_contact": approved,
            "quality_standards": ["reg_11_positive_relationships"],
            "standards_rationale": "Linked from family/contact profile workflow",
            "evidence_strength": "high" if requires_review else "medium",
        },
    )
    conn.commit()
    return workflow


class FamilyContactCreatePayload(BaseModel):
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


class FamilyContactUpdatePayload(BaseModel):
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


class FamilyContactRecordCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    contact_datetime: str | None = None
    contact_type: str | None = None
    contact_person: str
    supervision_level: str | None = None
    location: str | None = None
    pre_contact_presentation: str | None = None
    post_contact_presentation: str | None = None
    child_voice: str | None = None
    concerns: str | None = None
    follow_up_required: bool | None = False
    created_by: int | None = None


class FamilyContactRecordUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    contact_datetime: str | None = None
    contact_type: str | None = None
    contact_person: str | None = None
    supervision_level: str | None = None
    location: str | None = None
    pre_contact_presentation: str | None = None
    post_contact_presentation: str | None = None
    child_voice: str | None = None
    concerns: str | None = None
    follow_up_required: bool | None = None
    created_by: int | None = None


@router.get("/{young_person_id}/family")
def get_young_person_family(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    return YoungPersonFamilyService.get_family_bundle(conn, young_person_id)


@router.get("/family/contacts/{contact_id}")
def get_family_contact(contact_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_contact(conn, contact_id, current_user)
    return YoungPersonFamilyService.get_contact(conn, contact_id)


@router.get("/family/records/{record_id}")
def get_family_contact_record(record_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_family_record(conn, record_id, current_user)
    return YoungPersonFamilyService.get_family_contact_record(conn, record_id)


@router.post("/{young_person_id}/family/contacts")
def create_family_contact(young_person_id: int, payload: FamilyContactCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    contact = YoungPersonFamilyService.create_contact(conn, young_person_id=young_person_id, payload=payload.model_dump(exclude_none=True))
    row = _load_and_check_contact(conn, int(contact["id"]), current_user)
    workflow = _link_family_contact_profile_event(conn, row=row, event_type="created", current_user=current_user)
    return {**contact, "workflow": workflow}


@router.patch("/family/contacts/{contact_id}")
@router.put("/family/contacts/{contact_id}")
def update_family_contact(contact_id: int, payload: FamilyContactUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_contact(conn, contact_id, current_user)
    contact = YoungPersonFamilyService.update_contact(conn, contact_id=contact_id, payload=payload.model_dump(exclude_unset=True))
    row = _load_and_check_contact(conn, contact_id, current_user)
    workflow = _link_family_contact_profile_event(conn, row=row, event_type="updated", current_user=current_user)
    return {**contact, "workflow": workflow}


@router.post("/{young_person_id}/family/records")
def create_family_contact_record(young_person_id: int, payload: FamilyContactRecordCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    return YoungPersonFamilyService.create_family_contact_record(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
        actor_user_id=_actor_id(current_user),
        linking_service=YoungPeopleLinkingService,
    )


@router.patch("/family/records/{record_id}")
@router.put("/family/records/{record_id}")
def update_family_contact_record(record_id: int, payload: FamilyContactRecordUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_family_record(conn, record_id, current_user)
    return YoungPersonFamilyService.update_family_contact_record(conn, record_id=record_id, payload=payload.model_dump(exclude_unset=True))
