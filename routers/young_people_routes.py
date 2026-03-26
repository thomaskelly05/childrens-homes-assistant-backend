from __future__ import annotations

from datetime import date
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
    upsert_legal_status,
)

router = APIRouter(prefix="/young-people", tags=["Young People"])


class YoungPersonCreatePayload(BaseModel):
    home_id: int
    first_name: str = Field(min_length=1)
    last_name: str | None = None
    preferred_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    ethnicity: str | None = None
    nhs_number: str | None = None
    local_id_number: str | None = None
    admission_date: date | None = None
    discharge_date: date | None = None
    placement_status: str | None = None
    primary_keyworker_id: int | None = None
    summary_risk_level: str | None = None
    photo_url: str | None = None
    archived: bool = False


class YoungPersonUpdatePayload(BaseModel):
    home_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    preferred_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    ethnicity: str | None = None
    nhs_number: str | None = None
    local_id_number: str | None = None
    admission_date: date | None = None
    discharge_date: date | None = None
    placement_status: str | None = None
    primary_keyworker_id: int | None = None
    summary_risk_level: str | None = None
    photo_url: str | None = None
    archived: bool | None = None


class YoungPersonCommunicationProfilePayload(BaseModel):
    neurodiversity_summary: str | None = None
    communication_style: str | None = None
    sensory_profile: str | None = None
    processing_needs: str | None = None
    signs_of_distress: str | None = None
    what_helps: str | None = None
    what_to_avoid: str | None = None
    routines_and_predictability: str | None = None
    visual_support_needs: str | None = None


class YoungPersonEducationProfilePayload(BaseModel):
    school_name: str | None = None
    year_group: str | None = None
    education_status: str | None = None
    sen_status: str | None = None
    ehcp_details: str | None = None
    designated_teacher: str | None = None
    attendance_baseline: float | None = None
    pep_status: str | None = None
    support_summary: str | None = None


class YoungPersonHealthProfilePayload(BaseModel):
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


class YoungPersonIdentityProfilePayload(BaseModel):
    religion_or_faith: str | None = None
    cultural_identity: str | None = None
    first_language: str | None = None
    dietary_needs: str | None = None
    interests: str | None = None
    strengths_summary: str | None = None
    what_matters_to_me: str | None = None
    important_dates: str | None = None


class YoungPersonLegalStatusPayload(BaseModel):
    legal_status: str | None = None
    order_type: str | None = None
    order_details: str | None = None
    delegated_authority_details: str | None = None
    restrictions_text: str | None = None
    consent_arrangements: str | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    is_current: bool = True


class YoungPersonContactPayload(BaseModel):
    contact_type: str | None = None
    full_name: str = Field(min_length=1)
    relationship_to_young_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    is_parental_responsibility_holder: bool = False
    is_approved_contact: bool = False
    is_restricted_contact: bool = False
    supervision_level: str | None = None
    notes: str | None = None


class YoungPersonAlertPayload(BaseModel):
    alert_type: str | None = None
    title: str = Field(min_length=1)
    description: str | None = None
    severity: str | None = None
    is_active: bool = True
    show_globally: bool = False
    review_date: date | None = None


def _ensure_person_exists(conn, young_person_id: int) -> dict[str, Any]:
    person = get_young_person_by_id(conn, young_person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Young person not found")
    return person


def _fetchall_dicts(cur) -> list[dict[str, Any]]:
    rows = cur.fetchall() or []
    return [dict(row) for row in rows]


@router.get("")
@router.get("/")
def api_list_young_people(
    home_id: int | None = Query(default=None),
    include_archived: bool = Query(default=False),
    search: str = Query(default=""),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = list_young_people(
        conn,
        home_id=home_id,
        include_archived=include_archived,
        search=search,
    )
    return {"young_people": rows}


@router.post("")
@router.post("/")
def api_create_young_person(
    payload: YoungPersonCreatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    row = create_young_person(
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
    return {"ok": True, "young_person": row}


@router.get("/{young_person_id}")
def api_get_young_person(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    person = _ensure_person_exists(conn, young_person_id)
    return {"young_person": person}


@router.patch("/{young_person_id}")
def api_update_young_person(
    young_person_id: int,
    payload: YoungPersonUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)
    row = update_young_person(
        conn,
        young_person_id,
        payload.model_dump(exclude_none=True),
    )
    return {"ok": True, "young_person": row}


@router.get("/{young_person_id}/overview")
def api_get_young_person_overview(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    overview = get_young_person_overview(conn, young_person_id)
    if not overview:
        raise HTTPException(status_code=404, detail="Young person not found")
    return {"ok": True, "overview": overview}

@router.get("/{young_person_id}/timeline")
def api_get_young_person_timeline(
    young_person_id: int,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    record_type: str = Query(default=""),
    search: str = Query(default=""),
    limit: int = Query(default=250, ge=1, le=1000),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)

    rows = get_young_person_timeline(
        conn,
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

@router.post("/{young_person_id}/communication-profile")
def api_upsert_communication_profile(
    young_person_id: int,
    payload: YoungPersonCommunicationProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)
    row = upsert_communication_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "communication_profile": row}


@router.post("/{young_person_id}/education-profile")
def api_upsert_education_profile(
    young_person_id: int,
    payload: YoungPersonEducationProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)
    row = upsert_education_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "education_profile": row}


@router.post("/{young_person_id}/health-profile")
def api_upsert_health_profile(
    young_person_id: int,
    payload: YoungPersonHealthProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)
    row = upsert_health_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "health_profile": row}


@router.post("/{young_person_id}/identity-profile")
def api_upsert_identity_profile(
    young_person_id: int,
    payload: YoungPersonIdentityProfilePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)
    row = upsert_identity_profile(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "identity_profile": row}


@router.post("/{young_person_id}/legal-status")
def save_young_person_legal_status(
    young_person_id: int,
    payload: YoungPersonLegalStatusPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)

    row = upsert_legal_status(
        conn,
        young_person_id=young_person_id,
        created_by=current_user["user_id"],
        payload=payload.model_dump(),
    )
    return {"ok": True, "legal_status": row}


@router.post("/{young_person_id}/contacts")
def api_add_contact(
    young_person_id: int,
    payload: YoungPersonContactPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)
    row = add_contact(
        conn,
        young_person_id=young_person_id,
        payload=payload.model_dump(),
    )
    return {"ok": True, "contact": row}


@router.post("/{young_person_id}/alerts")
def api_add_alert(
    young_person_id: int,
    payload: YoungPersonAlertPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)
    row = add_alert(
        conn,
        young_person_id=young_person_id,
        created_by=current_user["user_id"],
        payload=payload.model_dump(),
    )
    return {"ok": True, "alert": row}


@router.get("/{young_person_id}/timeline")
def api_get_young_person_timeline(
    young_person_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_person_exists(conn, young_person_id)

    timeline: list[dict[str, Any]] = []

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                'daily_note' AS item_type,
                id AS source_id,
                note_date::timestamp AS event_at,
                COALESCE(shift_type, 'daily note') AS title,
                COALESCE(positives, activities, presentation, actions_required, '') AS summary,
                workflow_status AS status
            FROM daily_notes
            WHERE young_person_id = %s
            ORDER BY note_date DESC, id DESC
            LIMIT %s
            """,
            (young_person_id, limit),
        )
        timeline.extend(_fetchall_dicts(cur))

        cur.execute(
            """
            SELECT
                'incident' AS item_type,
                id AS source_id,
                COALESCE(incident_datetime, created_at) AS event_at,
                COALESCE(incident_type, 'incident') AS title,
                COALESCE(description, outcome, actions_taken, '') AS summary,
                workflow_status AS status
            FROM incidents
            WHERE young_person_id = %s
            ORDER BY COALESCE(incident_datetime, created_at) DESC, id DESC
            LIMIT %s
            """,
            (young_person_id, limit),
        )
        timeline.extend(_fetchall_dicts(cur))

        cur.execute(
            """
            SELECT
                'keywork' AS item_type,
                id AS source_id,
                session_date::timestamp AS event_at,
                COALESCE(topic, 'keywork session') AS title,
                COALESCE(summary, child_voice, actions_agreed, '') AS summary,
                workflow_status AS status
            FROM keywork_sessions
            WHERE young_person_id = %s
            ORDER BY session_date DESC, id DESC
            LIMIT %s
            """,
            (young_person_id, limit),
        )
        timeline.extend(_fetchall_dicts(cur))

        cur.execute(
            """
            SELECT
                'health' AS item_type,
                id AS source_id,
                COALESCE(event_datetime, created_at) AS event_at,
                COALESCE(title, record_type, 'health record') AS title,
                COALESCE(summary, outcome, '') AS summary,
                NULL::text AS status
            FROM health_records
            WHERE young_person_id = %s
            ORDER BY COALESCE(event_datetime, created_at) DESC, id DESC
            LIMIT %s
            """,
            (young_person_id, limit),
        )
        timeline.extend(_fetchall_dicts(cur))

        cur.execute(
            """
            SELECT
                'education' AS item_type,
                id AS source_id,
                record_date::timestamp AS event_at,
                COALESCE(provision_name, 'education record') AS title,
                COALESCE(achievement_note, issue_raised, behaviour_summary, '') AS summary,
                attendance_status AS status
            FROM education_records
            WHERE young_person_id = %s
            ORDER BY record_date DESC, id DESC
            LIMIT %s
            """,
            (young_person_id, limit),
        )
        timeline.extend(_fetchall_dicts(cur))

        cur.execute(
            """
            SELECT
                'family_contact' AS item_type,
                id AS source_id,
                COALESCE(contact_datetime, created_at) AS event_at,
                COALESCE(contact_person, contact_type, 'family contact') AS title,
                COALESCE(post_contact_presentation, concerns, child_voice, '') AS summary,
                NULL::text AS status
            FROM family_contact_records
            WHERE young_person_id = %s
            ORDER BY COALESCE(contact_datetime, created_at) DESC, id DESC
            LIMIT %s
            """,
            (young_person_id, limit),
        )
        timeline.extend(_fetchall_dicts(cur))

        cur.execute(
            """
            SELECT
                'chronology' AS item_type,
                id AS source_id,
                COALESCE(event_datetime, created_at) AS event_at,
                COALESCE(title, category, 'chronology event') AS title,
                COALESCE(summary, significance, '') AS summary,
                event_status AS status
            FROM chronology_events
            WHERE young_person_id = %s
            ORDER BY COALESCE(event_datetime, created_at) DESC, id DESC
            LIMIT %s
            """,
            (young_person_id, limit),
        )
        timeline.extend(_fetchall_dicts(cur))

    timeline.sort(
        key=lambda x: (
            x.get("event_at") is None,
            x.get("event_at"),
            x.get("source_id") or 0,
        ),
        reverse=True,
    )

    return {
        "ok": True,
        "timeline": timeline[:limit],
    }
