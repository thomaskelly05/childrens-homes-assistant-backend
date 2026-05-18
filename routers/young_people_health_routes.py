from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.workflow_response import gold_standard_response, sync_not_observed
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


def _actor_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


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


def _health_record_gold_response(
    conn,
    *,
    record_id: int,
    result: dict[str, Any] | None = None,
    workflow: Any | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    result = result or {}
    row = YoungPersonHealthService.get_health_record(conn, record_id)
    item = YoungPersonHealthService.transform_health_record(row)
    return gold_standard_response(
        id=record_id,
        item=item,
        message=message or result.get("message"),
        workflow=workflow if workflow is not None else result.get("workflow") or {},
        sync=result.get("sync") or sync_not_observed(),
        health_record=item,
        legacy=result,
    )


def _medication_profile_gold_response(
    *,
    item: dict[str, Any],
    result: dict[str, Any] | None = None,
    workflow: Any | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    result = result or {}
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message or result.get("message"),
        workflow=workflow if workflow is not None else result.get("workflow") or {},
        sync=result.get("sync") or sync_not_observed(),
        medication_profile=item,
        legacy=result,
    )


def _medication_record_gold_response(
    *,
    item: dict[str, Any],
    result: dict[str, Any] | None = None,
    workflow: Any | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    result = result or {}
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message or result.get("message"),
        workflow=workflow if workflow is not None else result.get("workflow") or {},
        sync=result.get("sync") or sync_not_observed(),
        medication_record=item,
        legacy=result,
    )


def _filter_archived(rows: list[dict[str, Any]], archived: bool) -> list[dict[str, Any]]:
    return [row for row in rows if bool(row.get("archived")) is archived]


def _link_health_profile_event(conn, *, row: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    actor = _actor_id(current_user)
    young_person_id = int(row.get("young_person_id"))
    title = "Health profile updated" if event_type == "updated" else "Health profile created"
    summary = "Health profile details changed, including GP, allergies, diagnoses, mental health, medication or consent information where supplied."
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=young_person_id,
        source_table="young_person_health_profile",
        source_id=int(row.get("id")),
        event_type=event_type,
        title=title,
        summary=summary,
        narrative=" ".join(str(row.get(key) or "") for key in ("allergies", "diagnoses", "mental_health_summary", "medication_summary", "consent_notes")) or summary,
        category="health",
        subcategory="health_profile",
        significance="medium",
        owner_id=actor,
        created_by=actor,
        workflow={
            "link_chronology": True,
            "create_task": False,
            "manager_review": True,
            "safeguarding": False,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "health_update": summary,
            "quality_standards": ["reg_10_health_and_wellbeing"],
            "standards_rationale": "Linked from health profile update",
            "evidence_strength": "medium",
        },
    )
    conn.commit()
    return workflow


def _link_medication_profile_event(conn, *, row: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    actor = _actor_id(current_user)
    young_person_id = int(row.get("young_person_id"))
    medication = row.get("medication_name") or "Medication"
    title = f"Medication profile {event_type}: {medication}"
    summary = f"Medication profile {event_type} for {medication}."
    requires_review = row.get("is_active") is False or bool(row.get("end_date")) or bool(row.get("prn_guidance"))
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=young_person_id,
        source_table="medication_profiles",
        source_id=int(row.get("id")),
        event_type=event_type,
        title=title,
        summary=summary,
        narrative=" ".join(str(row.get(key) or "") for key in ("medication_name", "dosage", "route", "frequency", "prn_guidance", "prescribed_by", "notes")) or summary,
        category="health",
        subcategory="medication_profile",
        significance="medium" if not requires_review else "high",
        review_date=row.get("end_date"),
        owner_id=actor,
        created_by=actor,
        workflow={
            "link_chronology": True,
            "create_task": requires_review,
            "manager_review": requires_review,
            "safeguarding": False,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "health_update": summary,
            "medication_name": medication,
            "quality_standards": ["reg_10_health_and_wellbeing"],
            "standards_rationale": "Linked from medication profile workflow",
            "evidence_strength": "medium" if not requires_review else "high",
        },
    )
    conn.commit()
    return workflow


def _link_medication_record_event(conn, *, row: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    actor = _actor_id(current_user)
    young_person_id = int(row.get("young_person_id"))
    medication = row.get("medication_name") or "Medication"
    status = str(row.get("status") or "recorded").lower()
    error_flag = bool(row.get("error_flag"))
    review_required = error_flag or status in {"refused", "omitted", "missed", "error", "not_administered"} or bool(row.get("error_details"))
    title = f"Medication administration {event_type}: {medication}"
    summary = f"Medication administration {event_type} for {medication}; status: {status}."
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=young_person_id,
        source_table="medication_records",
        source_id=int(row.get("id")),
        event_type=event_type,
        title=title,
        summary=summary,
        narrative=" ".join(str(row.get(key) or "") for key in ("medication_name", "dose", "route", "status", "refusal_reason", "omission_reason", "error_details")) or summary,
        category="health",
        subcategory="medication_administration",
        significance="high" if review_required else "medium",
        due_date=row.get("scheduled_time") or row.get("administered_time"),
        owner_id=actor,
        created_by=actor,
        workflow={
            "link_chronology": True,
            "create_task": review_required,
            "manager_review": review_required,
            "safeguarding": error_flag,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "health_update": summary,
            "medication_name": medication,
            "medication_status": status,
            "medication_error": error_flag,
            "response_actions": row.get("error_details") or row.get("refusal_reason") or row.get("omission_reason"),
            "quality_standards": ["reg_10_health_and_wellbeing"],
            "standards_rationale": "Linked from medication administration workflow",
            "evidence_strength": "high" if review_required else "medium",
        },
    )
    conn.commit()
    return workflow


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
def get_young_person_health(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    return YoungPersonHealthService.get_health_bundle(conn, young_person_id)


@router.get("/{young_person_id}/health/archive")
def list_archived_health_records(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    bundle = YoungPersonHealthService.get_health_bundle(conn, young_person_id)
    records = bundle.get("health_records") if isinstance(bundle, dict) else []
    rows = _filter_archived(records if isinstance(records, list) else [], True)
    return {"items": rows, "health_records": rows, "count": len(rows)}


@router.get("/{young_person_id}/medication-records")
def list_medication_records(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    bundle = YoungPersonHealthService.get_health_bundle(conn, young_person_id)
    rows = bundle.get("medication_records") if isinstance(bundle, dict) else []
    rows = rows if isinstance(rows, list) else []
    return {"items": rows, "medication_records": rows, "count": len(rows)}


@router.get("/{young_person_id}/medication-records/archive")
def list_archived_medication_records(young_person_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _load_and_check_young_person(conn, young_person_id, current_user)
    bundle = YoungPersonHealthService.get_health_bundle(conn, young_person_id)
    records = bundle.get("medication_records") if isinstance(bundle, dict) else []
    rows = _filter_archived(records if isinstance(records, list) else [], True)
    return {"items": rows, "medication_records": rows, "count": len(rows)}


@router.get("/health-records/{record_id}")
def get_health_record(record_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    row = _load_and_check_health_record(conn, record_id, current_user)
    return YoungPersonHealthService.transform_health_record(row)


@router.get("/medication-profiles/{profile_id}")
def get_medication_profile(profile_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    row = _load_and_check_medication_profile(conn, profile_id, current_user)
    return YoungPersonHealthService.transform_medication_profile(row)


@router.get("/medication-records/{record_id}")
def get_medication_record(record_id: int, conn=Depends(get_db), current_user=Depends(get_current_user)):
    row = _load_and_check_medication_record(conn, record_id, current_user)
    return YoungPersonHealthService.transform_medication_record(row)


@router.put("/{young_person_id}/health/profile")
@router.put("/{young_person_id}/health-profile")
def upsert_health_profile(young_person_id: int, payload: HealthProfileUpsertPayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    row = YoungPersonHealthService.upsert_health_profile(conn, young_person_id=young_person_id, payload=payload.model_dump(exclude_none=True))
    workflow = _link_health_profile_event(conn, row=row, event_type="updated", current_user=current_user)
    return gold_standard_response(
        id=row.get("id"),
        item=row,
        message="Health profile updated",
        workflow=workflow,
        sync=sync_not_observed("health_profile_linking_observed_but_os_sync_not_exposed"),
        health_profile=row,
    )


@router.post("/{young_person_id}/health-records")
def create_health_record(young_person_id: int, payload: HealthRecordCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    result = YoungPersonHealthService.create_health_record(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(exclude_none=True),
        actor_user_id=_actor_id(current_user),
        linking_service=YoungPeopleLinkingService,
    )
    record_id = _safe_int(result.get("id") if isinstance(result, dict) else None)
    if not record_id:
        return result
    return _health_record_gold_response(conn, record_id=record_id, result=result, message="Health record created")


@router.patch("/health-records/{record_id}")
@router.put("/health-records/{record_id}")
def update_health_record(record_id: int, payload: HealthRecordUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_health_record(conn, record_id, current_user)
    result = YoungPersonHealthService.update_health_record(conn, record_id=record_id, payload=payload.model_dump(exclude_unset=True))
    return _health_record_gold_response(conn, record_id=record_id, result=result, message="Health record updated")


@router.post("/{young_person_id}/medication-profiles")
def create_medication_profile(young_person_id: int, payload: MedicationProfileCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    result = YoungPersonHealthService.create_medication_profile(conn, young_person_id=young_person_id, payload=payload.model_dump(exclude_none=True))
    row = _load_and_check_medication_profile(conn, int(result["id"]), current_user)
    item = YoungPersonHealthService.transform_medication_profile(row)
    workflow = _link_medication_profile_event(conn, row=row, event_type="created", current_user=current_user)
    return _medication_profile_gold_response(item=item, result=result, workflow=workflow, message="Medication profile created")


@router.patch("/medication-profiles/{profile_id}")
@router.put("/medication-profiles/{profile_id}")
def update_medication_profile(profile_id: int, payload: MedicationProfileUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_medication_profile(conn, profile_id, current_user)
    result = YoungPersonHealthService.update_medication_profile(conn, profile_id=profile_id, payload=payload.model_dump(exclude_unset=True))
    row = _load_and_check_medication_profile(conn, profile_id, current_user)
    item = YoungPersonHealthService.transform_medication_profile(row)
    workflow = _link_medication_profile_event(conn, row=row, event_type="updated", current_user=current_user)
    return _medication_profile_gold_response(item=item, result=result, workflow=workflow, message="Medication profile updated")


@router.post("/{young_person_id}/medication-records")
def create_medication_record(young_person_id: int, payload: MedicationRecordCreatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_young_person(conn, young_person_id, current_user)
    result = YoungPersonHealthService.create_medication_record(conn, young_person_id=young_person_id, payload=payload.model_dump(exclude_none=True))
    row = _load_and_check_medication_record(conn, int(result["id"]), current_user)
    item = YoungPersonHealthService.transform_medication_record(row)
    workflow = _link_medication_record_event(conn, row=row, event_type="created", current_user=current_user)
    return _medication_record_gold_response(item=item, result=result, workflow=workflow, message="Medication record created")


@router.patch("/medication-records/{record_id}")
@router.put("/medication-records/{record_id}")
def update_medication_record(record_id: int, payload: MedicationRecordUpdatePayload, conn=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_can_edit(current_user)
    _load_and_check_medication_record(conn, record_id, current_user)
    result = YoungPersonHealthService.update_medication_record(conn, record_id=record_id, payload=payload.model_dump(exclude_unset=True))
    row = _load_and_check_medication_record(conn, record_id, current_user)
    item = YoungPersonHealthService.transform_medication_record(row)
    workflow = _link_medication_record_event(conn, row=row, event_type="updated", current_user=current_user)
    return _medication_record_gold_response(item=item, result=result, workflow=workflow, message="Medication record updated")
