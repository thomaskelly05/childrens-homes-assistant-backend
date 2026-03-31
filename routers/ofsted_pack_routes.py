from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/inspection-pack", tags=["Inspection Pack"])


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
        raise HTTPException(status_code=403, detail="You do not have access to this record")


def _assert_can_request_pack(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to request an inspection pack")


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _has_any_value(data: dict[str, Any] | None, keys: list[str]) -> bool:
    data = data or {}
    return any(bool(data.get(key)) for key in keys)


def _build_profile_readiness(bundle: dict[str, Any]) -> list[dict[str, Any]]:
    communication_profile = bundle.get("communication_profile") or {}
    education_profile = bundle.get("education_profile") or {}
    health_profile = bundle.get("health_profile") or {}
    identity_profile = bundle.get("identity_profile") or {}
    legal_status = bundle.get("legal_status") or {}
    contacts = bundle.get("contacts") or []

    checks = [
        {
            "section": "communication_profile",
            "title": "Communication profile",
            "is_present": _has_any_value(
                communication_profile,
                [
                    "communication_style",
                    "sensory_profile",
                    "processing_needs",
                    "signs_of_distress",
                    "what_helps",
                ],
            ),
        },
        {
            "section": "education_profile",
            "title": "Education profile",
            "is_present": _has_any_value(
                education_profile,
                [
                    "school_name",
                    "education_status",
                    "sen_status",
                    "support_summary",
                ],
            ),
        },
        {
            "section": "health_profile",
            "title": "Health profile",
            "is_present": _has_any_value(
                health_profile,
                [
                    "gp_name",
                    "allergies",
                    "diagnoses",
                    "mental_health_summary",
                    "medication_summary",
                ],
            ),
        },
        {
            "section": "identity_profile",
            "title": "Identity profile",
            "is_present": _has_any_value(
                identity_profile,
                [
                    "cultural_identity",
                    "first_language",
                    "interests",
                    "strengths_summary",
                    "what_matters_to_me",
                ],
            ),
        },
        {
            "section": "legal_status",
            "title": "Legal status",
            "is_present": _has_any_value(
                legal_status,
                [
                    "legal_status",
                    "order_type",
                    "delegated_authority_details",
                    "consent_arrangements",
                ],
            ),
        },
        {
            "section": "contacts",
            "title": "Contacts",
            "is_present": len(contacts) > 0,
        },
    ]

    for item in checks:
        item["status"] = "present" if item["is_present"] else "missing"

    return checks


class InspectionPackCreate(BaseModel):
    scope_type: str
    scope_id: int
    pack_type: str = "ofsted"
    requested_by: int | None = None


@router.post("")
def create_inspection_pack_job(
    payload: InspectionPackCreate,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_request_pack(current_user)

    requested_by = payload.requested_by or _safe_int(current_user.get("user_id"))

    if payload.scope_type == "young_person":
        _load_and_check_young_person(payload.scope_id, current_user)

    query = """
        INSERT INTO inspection_pack_jobs (
            scope_type,
            scope_id,
            pack_type,
            status,
            requested_by,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.scope_type,
        payload.scope_id,
        payload.pack_type,
        "queued",
        requested_by,
        datetime.utcnow(),
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create inspection pack job: {str(e)}")

    return {
        "ok": True,
        "message": "Inspection pack job created successfully",
        "id": row["id"],
    }


@router.get("/young-person/{young_person_id}")
def get_young_person_inspection_pack_data(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    young_person = _load_and_check_young_person(young_person_id, current_user)

    try:
        bundle = YoungPersonService.get_full_profile_bundle(young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM young_person_legal_status
                WHERE young_person_id = %s
                ORDER BY is_current DESC, effective_from DESC NULLS LAST, id DESC
                """,
                (young_person_id,),
            )
            legal_status = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM young_person_communication_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            communication_profile = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM young_person_identity_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            identity_profile = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM young_person_alerts
                WHERE young_person_id = %s
                ORDER BY is_active DESC, severity DESC, id DESC
                """,
                (young_person_id,),
            )
            alerts = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM support_plans
                WHERE young_person_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (young_person_id,),
            )
            plans = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM risk_assessments
                WHERE young_person_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (young_person_id,),
            )
            risks = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM daily_notes
                WHERE young_person_id = %s
                ORDER BY note_date DESC, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            )
            daily_notes = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM incidents
                WHERE young_person_id = %s
                ORDER BY COALESCE(incident_datetime, created_at) DESC, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            )
            incidents = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            health_profile = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM health_records
                WHERE young_person_id = %s
                ORDER BY event_datetime DESC, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            )
            health_records = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM medication_profiles
                WHERE young_person_id = %s
                ORDER BY is_active DESC, id DESC
                """,
                (young_person_id,),
            )
            medication_profiles = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM medication_records
                WHERE young_person_id = %s
                ORDER BY scheduled_time DESC, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            )
            medication_records = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            education_profile = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM education_records
                WHERE young_person_id = %s
                ORDER BY record_date DESC, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            )
            education_records = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM young_person_contacts
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            contacts = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM family_contact_records
                WHERE young_person_id = %s
                ORDER BY contact_datetime DESC, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            )
            family_records = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM keywork_sessions
                WHERE young_person_id = %s
                ORDER BY session_date DESC, id DESC
                LIMIT 50
                """,
                (young_person_id,),
            )
            keywork_sessions = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM chronology_events
                WHERE young_person_id = %s
                  AND COALESCE(is_visible, TRUE) = TRUE
                ORDER BY event_datetime DESC, id DESC
                LIMIT 100
                """,
                (young_person_id,),
            )
            chronology = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT
                    qs.code,
                    qs.title,
                    qs.short_label,
                    qs.display_order,
                    COUNT(rsl.id) AS linked_record_count
                FROM quality_standards qs
                LEFT JOIN record_standard_links rsl
                    ON qs.code = rsl.standard_code
                   AND rsl.young_person_id = %s
                GROUP BY qs.code, qs.title, qs.short_label, qs.display_order
                ORDER BY qs.display_order ASC
                """,
                (young_person_id,),
            )
            standards_summary = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT
                    rsl.*,
                    qs.title AS standard_title,
                    qs.short_label AS standard_short_label,
                    qs.display_order
                FROM record_standard_links rsl
                JOIN quality_standards qs
                  ON rsl.standard_code = qs.code
                WHERE rsl.young_person_id = %s
                ORDER BY qs.display_order ASC, rsl.created_at DESC, rsl.id DESC
                """,
                (young_person_id,),
            )
            standards_evidence = [dict(row) for row in (cur.fetchall() or [])]

            cur.execute(
                """
                SELECT *
                FROM monthly_reviews
                WHERE young_person_id = %s
                ORDER BY review_month DESC, id DESC
                """,
                (young_person_id,),
            )
            monthly_reviews = [dict(row) for row in (cur.fetchall() or [])]

            compliance_items: list[dict[str, Any]] = []

            cur.execute(
                """
                SELECT
                    'support_plan_review' AS compliance_type,
                    sp.id,
                    sp.title,
                    sp.review_date AS due_date,
                    sp.status,
                    sp.approval_status,
                    sp.created_at,
                    CASE
                        WHEN sp.review_date IS NULL THEN 'ok'
                        WHEN sp.review_date < CURRENT_DATE THEN 'overdue'
                        WHEN sp.review_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                        ELSE 'ok'
                    END AS compliance_status
                FROM support_plans sp
                WHERE sp.young_person_id = %s
                  AND COALESCE(sp.archived, FALSE) = FALSE
                ORDER BY sp.review_date ASC NULLS LAST, sp.id DESC
                """,
                (young_person_id,),
            )
            compliance_items.extend([dict(row) for row in (cur.fetchall() or [])])

            cur.execute(
                """
                SELECT
                    'risk_review' AS compliance_type,
                    ra.id,
                    ra.title,
                    ra.review_date AS due_date,
                    ra.status,
                    ra.approval_status,
                    ra.created_at,
                    CASE
                        WHEN ra.review_date IS NULL THEN 'ok'
                        WHEN ra.review_date < CURRENT_DATE THEN 'overdue'
                        WHEN ra.review_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                        ELSE 'ok'
                    END AS compliance_status
                FROM risk_assessments ra
                WHERE ra.young_person_id = %s
                  AND COALESCE(ra.archived, FALSE) = FALSE
                ORDER BY ra.review_date ASC NULLS LAST, ra.id DESC
                """,
                (young_person_id,),
            )
            compliance_items.extend([dict(row) for row in (cur.fetchall() or [])])

            cur.execute(
                """
                SELECT
                    'keywork_follow_up' AS compliance_type,
                    ks.id,
                    ks.topic AS title,
                    ks.next_session_date AS due_date,
                    NULL::text AS status,
                    NULL::text AS approval_status,
                    ks.created_at,
                    CASE
                        WHEN ks.next_session_date IS NULL THEN 'ok'
                        WHEN ks.next_session_date < CURRENT_DATE THEN 'overdue'
                        WHEN ks.next_session_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                        ELSE 'ok'
                    END AS compliance_status
                FROM keywork_sessions ks
                WHERE ks.young_person_id = %s
                ORDER BY ks.next_session_date ASC NULLS LAST, ks.id DESC
                """,
                (young_person_id,),
            )
            compliance_items.extend([dict(row) for row in (cur.fetchall() or [])])

        profile_readiness = _build_profile_readiness(bundle)
        missing_profile_sections = [item for item in profile_readiness if item["status"] == "missing"]
        overdue_items = [item for item in compliance_items if item.get("compliance_status") == "overdue"]
        due_soon_items = [item for item in compliance_items if item.get("compliance_status") == "due_soon"]

        readiness = {
            "has_active_alerts": len([a for a in alerts if a.get("is_active") in (True, None)]) > 0,
            "has_overdue_compliance": len(overdue_items) > 0,
            "has_due_soon_compliance": len(due_soon_items) > 0,
            "missing_profile_sections_count": len(missing_profile_sections),
            "standards_with_evidence_count": len([x for x in standards_summary if int(x.get("linked_record_count") or 0) > 0]),
            "standards_total_count": len(standards_summary),
        }

        summary = {
            "alerts_count": len(alerts),
            "plans_count": len(plans),
            "risks_count": len(risks),
            "daily_notes_count": len(daily_notes),
            "incidents_count": len(incidents),
            "health_records_count": len(health_records),
            "medication_records_count": len(medication_records),
            "education_records_count": len(education_records),
            "family_records_count": len(family_records),
            "keywork_sessions_count": len(keywork_sessions),
            "chronology_count": len(chronology),
            "monthly_reviews_count": len(monthly_reviews),
            "compliance_items_count": len(compliance_items),
            "overdue_compliance_count": len(overdue_items),
            "due_soon_compliance_count": len(due_soon_items),
            "missing_profile_sections_count": len(missing_profile_sections),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build inspection pack data: {str(e)}")

    return {
        "ok": True,
        "scope": {
            "scope_type": "young_person",
            "scope_id": young_person_id,
            "pack_type": "ofsted",
        },
        "summary": summary,
        "readiness": readiness,
        "young_person": dict(young_person),
        "profiles": {
            "legal_status": legal_status,
            "communication_profile": communication_profile,
            "identity_profile": identity_profile,
            "health_profile": health_profile,
            "education_profile": education_profile,
            "contacts": contacts,
            "alerts": alerts,
            "profile_readiness": profile_readiness,
        },
        "care_and_safeguarding": {
            "plans": plans,
            "risks": risks,
            "daily_notes": daily_notes,
            "incidents": incidents,
            "family_records": family_records,
            "keywork_sessions": keywork_sessions,
            "chronology": chronology,
        },
        "health": {
            "health_records": health_records,
            "medication_profiles": medication_profiles,
            "medication_records": medication_records,
        },
        "education": {
            "education_records": education_records,
        },
        "quality_and_review": {
            "standards_summary": standards_summary,
            "standards_evidence": standards_evidence,
            "monthly_reviews": monthly_reviews,
            "compliance_items": compliance_items,
        },
    }
