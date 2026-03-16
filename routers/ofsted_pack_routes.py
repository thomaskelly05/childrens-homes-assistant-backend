from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/inspection-pack", tags=["Inspection Pack"])


class InspectionPackCreate(BaseModel):
    scope_type: str
    scope_id: int
    pack_type: str = "ofsted"
    requested_by: int | None = None


@router.post("")
def create_inspection_pack_job(
    payload: InspectionPackCreate,
    conn=Depends(get_db),
):
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
        payload.requested_by,
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
):
    try:
        with conn.cursor() as cur:
            # Young person core
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

            # Profile / identity / communication / alerts
            cur.execute(
                """
                SELECT *
                FROM young_person_legal_status
                WHERE young_person_id = %s
                ORDER BY is_current DESC, effective_from DESC NULLS LAST, id DESC
                """,
                (young_person_id,),
            )
            legal_status = cur.fetchall()

            cur.execute(
                """
                SELECT *
                FROM young_person_communication_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            communication_profile = cur.fetchall()

            cur.execute(
                """
                SELECT *
                FROM young_person_identity_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            identity_profile = cur.fetchall()

            cur.execute(
                """
                SELECT *
                FROM young_person_alerts
                WHERE young_person_id = %s
                ORDER BY is_active DESC, severity DESC, id DESC
                """,
                (young_person_id,),
            )
            alerts = cur.fetchall()

            # Plans
            cur.execute(
                """
                SELECT *
                FROM support_plans
                WHERE young_person_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (young_person_id,),
            )
            plans = cur.fetchall()

            # Risk
            cur.execute(
                """
                SELECT *
                FROM risk_assessments
                WHERE young_person_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (young_person_id,),
            )
            risks = cur.fetchall()

            # Daily notes
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
            daily_notes = cur.fetchall()

            # Incidents
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
            incidents = cur.fetchall()

            # Health
            cur.execute(
                """
                SELECT *
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            health_profile = cur.fetchall()

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
            health_records = cur.fetchall()

            cur.execute(
                """
                SELECT *
                FROM medication_profiles
                WHERE young_person_id = %s
                ORDER BY is_active DESC, id DESC
                """,
                (young_person_id,),
            )
            medication_profiles = cur.fetchall()

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
            medication_records = cur.fetchall()

            # Education
            cur.execute(
                """
                SELECT *
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            education_profile = cur.fetchall()

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
            education_records = cur.fetchall()

            # Family
            cur.execute(
                """
                SELECT *
                FROM young_person_contacts
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            contacts = cur.fetchall()

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
            family_records = cur.fetchall()

            # Keywork
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
            keywork_sessions = cur.fetchall()

            # Chronology
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
            chronology = cur.fetchall()

            # Standards summary
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
            standards_summary = cur.fetchall()

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
            standards_evidence = cur.fetchall()

            # Monthly reviews
            cur.execute(
                """
                SELECT *
                FROM monthly_reviews
                WHERE young_person_id = %s
                ORDER BY review_month DESC, id DESC
                """,
                (young_person_id,),
            )
            monthly_reviews = cur.fetchall()

            # Compliance
            compliance_items = []

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
            compliance_items.extend(cur.fetchall())

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
            compliance_items.extend(cur.fetchall())

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
            compliance_items.extend(cur.fetchall())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build inspection pack data: {str(e)}")

    return {
        "young_person": young_person,
        "legal_status": legal_status,
        "communication_profile": communication_profile,
        "identity_profile": identity_profile,
        "alerts": alerts,
        "plans": plans,
        "risks": risks,
        "daily_notes": daily_notes,
        "incidents": incidents,
        "health_profile": health_profile,
        "health_records": health_records,
        "medication_profiles": medication_profiles,
        "medication_records": medication_records,
        "education_profile": education_profile,
        "education_records": education_records,
        "contacts": contacts,
        "family_records": family_records,
        "keywork_sessions": keywork_sessions,
        "chronology": chronology,
        "standards_summary": standards_summary,
        "standards_evidence": standards_evidence,
        "monthly_reviews": monthly_reviews,
        "compliance_items": compliance_items,
    }
