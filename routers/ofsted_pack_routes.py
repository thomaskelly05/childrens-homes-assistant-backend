from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db

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
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _assert_can_create_pack(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to create an inspection pack")


def _load_and_check_young_person(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        young_person = cur.fetchone()

    if not young_person:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(young_person.get("home_id")))
    return young_person


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
    _assert_can_create_pack(current_user)

    if payload.scope_type == "young_person":
        _load_and_check_young_person(conn, payload.scope_id, current_user)

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
        payload.requested_by or _safe_int(current_user.get("user_id")),
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
        "message": "Inspection pack job created successfully",
        "id": row["id"],
    }


@router.get("/young-person/{young_person_id}")
def get_young_person_inspection_pack_data(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    young_person = _load_and_check_young_person(conn, young_person_id, current_user)

    try:
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
            legal_status = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM young_person_communication_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            communication_profile = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM young_person_identity_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            identity_profile = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM young_person_alerts
                WHERE young_person_id = %s
                ORDER BY is_active DESC, severity DESC, id DESC
                """,
                (young_person_id,),
            )
            alerts = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM support_plans
                WHERE young_person_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (young_person_id,),
            )
            plans = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM risk_assessments
                WHERE young_person_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (young_person_id,),
            )
            risks = cur.fetchall() or []

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
            daily_notes = cur.fetchall() or []

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
            incidents = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            health_profile = cur.fetchall() or []

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
            health_records = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM medication_profiles
                WHERE young_person_id = %s
                ORDER BY is_active DESC, id DESC
                """,
                (young_person_id,),
            )
            medication_profiles = cur.fetchall() or []

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
            medication_records = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            education_profile = cur.fetchall() or []

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
            education_records = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM young_person_contacts
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            contacts = cur.fetchall() or []

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
            family_records = cur.fetchall() or []

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
            keywork_sessions = cur.fetchall() or []

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
            chronology = cur.fetchall() or []

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
            standards_summary = cur.fetchall() or []

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
            standards_evidence = cur.fetchall() or []

            cur.execute(
                """
                SELECT *
                FROM monthly_reviews
                WHERE young_person_id = %s
                ORDER BY review_month DESC, id DESC
                """,
                (young_person_id,),
            )
            monthly_reviews = cur.fetchall() or []

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
            compliance_items.extend(cur.fetchall() or [])

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
            compliance_items.extend(cur.fetchall() or [])

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
            compliance_items.extend(cur.fetchall() or [])

        return {
            "young_person": dict(young_person),
            "legal_status": [dict(x) for x in legal_status],
            "communication_profile": [dict(x) for x in communication_profile],
            "identity_profile": [dict(x) for x in identity_profile],
            "alerts": [dict(x) for x in alerts],
            "plans": [dict(x) for x in plans],
            "risks": [dict(x) for x in risks],
            "daily_notes": [dict(x) for x in daily_notes],
            "incidents": [dict(x) for x in incidents],
            "health_profile": [dict(x) for x in health_profile],
            "health_records": [dict(x) for x in health_records],
            "medication_profiles": [dict(x) for x in medication_profiles],
            "medication_records": [dict(x) for x in medication_records],
            "education_profile": [dict(x) for x in education_profile],
            "education_records": [dict(x) for x in education_records],
            "contacts": [dict(x) for x in contacts],
            "family_records": [dict(x) for x in family_records],
            "keywork_sessions": [dict(x) for x in keywork_sessions],
            "chronology": [dict(x) for x in chronology],
            "standards_summary": [dict(x) for x in standards_summary],
            "standards_evidence": [dict(x) for x in standards_evidence],
            "monthly_reviews": [dict(x) for x in monthly_reviews],
            "compliance_items": [dict(x) for x in compliance_items],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build inspection pack data: {str(e)}")
