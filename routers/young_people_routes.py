from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


@router.get("")
def list_young_people(
    conn=Depends(get_db),
):
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
            yp.nhs_number,
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
            u.first_name AS primary_keyworker_first_name,
            u.last_name AS primary_keyworker_last_name
        FROM young_people yp
        LEFT JOIN users u
            ON yp.primary_keyworker_id = u.id
        WHERE COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC, yp.id ASC
    """

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return rows


@router.get("/list")
def list_young_people_alias(
    conn=Depends(get_db),
):
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
            yp.nhs_number,
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
            u.first_name AS primary_keyworker_first_name,
            u.last_name AS primary_keyworker_last_name
        FROM young_people yp
        LEFT JOIN users u
            ON yp.primary_keyworker_id = u.id
        WHERE COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC, yp.id ASC
    """

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}")
def get_young_person_overview(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    yp.id,
                    yp.home_id,
                    yp.first_name,
                    yp.last_name,
                    yp.preferred_name,
                    yp.date_of_birth,
                    yp.gender,
                    yp.ethnicity,
                    yp.nhs_number,
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
                    u.first_name AS primary_keyworker_first_name,
                    u.last_name AS primary_keyworker_last_name
                FROM young_people yp
                LEFT JOIN users u
                    ON yp.primary_keyworker_id = u.id
                WHERE yp.id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            young_person = cur.fetchone()

            if not young_person:
                raise HTTPException(status_code=404, detail="Young person not found")

            # Legal status
            cur.execute(
                """
                SELECT
                    legal_status,
                    order_type,
                    order_details
                FROM young_person_legal_status
                WHERE young_person_id = %s
                ORDER BY is_current DESC, effective_from DESC NULLS LAST, id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            legal = cur.fetchone()

            # Education profile
            cur.execute(
                """
                SELECT
                    school_name,
                    year_group,
                    education_status
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            education = cur.fetchone()

            # Health profile
            cur.execute(
                """
                SELECT
                    gp_name,
                    allergies,
                    diagnoses
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            health = cur.fetchone()

            # Communication profile
            cur.execute(
                """
                SELECT
                    communication_style,
                    sensory_profile
                FROM young_person_communication_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            communication = cur.fetchone()

            # Identity profile
            cur.execute(
                """
                SELECT
                    interests,
                    strengths_summary,
                    what_matters_to_me
                FROM young_person_identity_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            identity = cur.fetchone()

        overview = dict(young_person)

        if legal:
            overview.update({
                "legal_status": legal.get("legal_status"),
                "order_type": legal.get("order_type"),
                "order_details": legal.get("order_details"),
            })

        if education:
            overview.update({
                "school_name": education.get("school_name"),
                "year_group": education.get("year_group"),
                "education_status": education.get("education_status"),
            })

        if health:
            overview.update({
                "gp_name": health.get("gp_name"),
                "allergies": health.get("allergies"),
                "diagnoses": health.get("diagnoses"),
            })

        if communication:
            overview.update({
                "communication_style": communication.get("communication_style"),
                "sensory_profile": communication.get("sensory_profile"),
            })

        if identity:
            overview.update({
                "interests": identity.get("interests"),
                "strengths_summary": identity.get("strengths_summary"),
                "what_matters_to_me": identity.get("what_matters_to_me"),
            })

        return overview

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load young person overview: {str(e)}")
