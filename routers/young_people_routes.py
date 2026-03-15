from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


@router.get("")
def list_young_people(conn=Depends(get_db)):
    query = """
        SELECT
            yp.id,
            yp.home_id,
            yp.first_name,
            yp.last_name,
            yp.preferred_name,
            yp.date_of_birth,
            yp.gender,
            yp.ethnicity,
            yp.local_id_number,
            yp.admission_date,
            yp.discharge_date,
            yp.placement_status,
            yp.primary_keyworker_id,
            yp.summary_risk_level,
            yp.photo_url,
            yp.archived,
            yp.created_at,
            yp.updated_at,
            u.first_name AS keyworker_first_name,
            u.last_name AS keyworker_last_name
        FROM young_people yp
        LEFT JOIN users u ON yp.primary_keyworker_id = u.id
        WHERE COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC, yp.id ASC
    """

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return rows


@router.get("/list")
def list_young_people_alias(conn=Depends(get_db)):
    query = """
        SELECT
            yp.id,
            yp.home_id,
            yp.first_name,
            yp.last_name,
            yp.preferred_name,
            yp.date_of_birth,
            yp.gender,
            yp.ethnicity,
            yp.local_id_number,
            yp.admission_date,
            yp.discharge_date,
            yp.placement_status,
            yp.primary_keyworker_id,
            yp.summary_risk_level,
            yp.photo_url,
            yp.archived,
            yp.created_at,
            yp.updated_at,
            u.first_name AS keyworker_first_name,
            u.last_name AS keyworker_last_name
        FROM young_people yp
        LEFT JOIN users u ON yp.primary_keyworker_id = u.id
        WHERE COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC, yp.id ASC
    """

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}")
def get_young_person_overview(young_person_id: int, conn=Depends(get_db)):
    query = """
        SELECT
            yp.*,
            u.first_name AS keyworker_first_name,
            u.last_name AS keyworker_last_name,
            ls.legal_status,
            ls.order_type,
            ls.order_details,
            ls.delegated_authority_details,
            ls.restrictions_text,
            ls.consent_arrangements,
            edu.school_name,
            edu.year_group,
            edu.education_status,
            edu.sen_status,
            edu.ehcp_details,
            edu.designated_teacher,
            edu.attendance_baseline,
            edu.pep_status,
            edu.support_summary AS education_support_summary,
            hp.gp_name,
            hp.gp_contact,
            hp.dentist_name,
            hp.dentist_contact,
            hp.optician_name,
            hp.optician_contact,
            hp.allergies,
            hp.diagnoses,
            hp.mental_health_summary,
            hp.medication_summary,
            hp.consent_notes,
            cp.neurodiversity_summary,
            cp.communication_style,
            cp.sensory_profile,
            cp.processing_needs,
            cp.signs_of_distress,
            cp.what_helps,
            cp.what_to_avoid,
            cp.routines_and_predictability,
            cp.visual_support_needs,
            ip.religion_or_faith,
            ip.cultural_identity,
            ip.first_language,
            ip.dietary_needs,
            ip.interests,
            ip.strengths_summary,
            ip.what_matters_to_me,
            ip.important_dates
        FROM young_people yp
        LEFT JOIN users u
            ON yp.primary_keyworker_id = u.id
        LEFT JOIN LATERAL (
            SELECT *
            FROM young_person_legal_status
            WHERE young_person_id = yp.id
            ORDER BY is_current DESC, effective_from DESC NULLS LAST, id DESC
            LIMIT 1
        ) ls ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM young_person_education_profile
            WHERE young_person_id = yp.id
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
        ) edu ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM young_person_health_profile
            WHERE young_person_id = yp.id
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
        ) hp ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM young_person_communication_profile
            WHERE young_person_id = yp.id
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
        ) cp ON TRUE
        LEFT JOIN LATERAL (
            SELECT *
            FROM young_person_identity_profile
            WHERE young_person_id = yp.id
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
        ) ip ON TRUE
        WHERE yp.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")

    return row
