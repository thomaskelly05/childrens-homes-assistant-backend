from fastapi import APIRouter, Depends, HTTPException, Body
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Profile"])


@router.get("/{young_person_id}/profile")
def get_young_person_profile(
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
                LEFT JOIN users u ON yp.primary_keyworker_id = u.id
                WHERE yp.id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            young_person = cur.fetchone()
            if not young_person:
                raise HTTPException(status_code=404, detail="Young person not found")

            cur.execute(
                """
                SELECT *
                FROM young_person_legal_status
                WHERE young_person_id = %s
                ORDER BY COALESCE(is_current, FALSE) DESC, effective_from DESC NULLS LAST, id DESC
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
                SELECT
                    a.*,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM young_person_alerts a
                LEFT JOIN users u ON a.created_by = u.id
                WHERE a.young_person_id = %s
                ORDER BY COALESCE(a.is_active, TRUE) DESC, a.id DESC
                """,
                (young_person_id,),
            )
            alerts = cur.fetchall()

        return {
            "young_person": young_person,
            "legal_status": legal_status,
            "communication_profile": communication_profile,
            "identity_profile": identity_profile,
            "alerts": alerts,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load young person profile: {str(e)}")


@router.put("/{young_person_id}/profile/core")
def update_young_person_core(
    young_person_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_people
                SET
                    first_name = %(first_name)s,
                    last_name = %(last_name)s,
                    preferred_name = %(preferred_name)s,
                    date_of_birth = %(date_of_birth)s,
                    gender = %(gender)s,
                    ethnicity = %(ethnicity)s,
                    nhs_number = %(nhs_number)s,
                    local_id_number = %(local_id_number)s,
                    admission_date = %(admission_date)s,
                    discharge_date = %(discharge_date)s,
                    placement_status = %(placement_status)s,
                    primary_keyworker_id = %(primary_keyworker_id)s,
                    summary_risk_level = %(summary_risk_level)s,
                    updated_at = NOW()
                WHERE id = %(id)s
                RETURNING *
                """,
                {**payload, "id": young_person_id},
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Young person not found")

        conn.commit()
        return row

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update young person core profile: {str(e)}")


@router.put("/{young_person_id}/profile/communication")
def upsert_communication_profile(
    young_person_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM young_person_communication_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE young_person_communication_profile
                    SET
                        communication_style = %(communication_style)s,
                        sensory_profile = %(sensory_profile)s
                    WHERE id = %(id)s
                    RETURNING *
                    """,
                    {
                        "id": existing["id"],
                        "communication_style": payload.get("communication_style"),
                        "sensory_profile": payload.get("sensory_profile"),
                    },
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_communication_profile (
                        young_person_id,
                        communication_style,
                        sensory_profile
                    )
                    VALUES (
                        %(young_person_id)s,
                        %(communication_style)s,
                        %(sensory_profile)s
                    )
                    RETURNING *
                    """,
                    {
                        "young_person_id": young_person_id,
                        "communication_style": payload.get("communication_style"),
                        "sensory_profile": payload.get("sensory_profile"),
                    },
                )

            row = cur.fetchone()

        conn.commit()
        return row

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update communication profile: {str(e)}")


@router.put("/{young_person_id}/profile/identity")
def upsert_identity_profile(
    young_person_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM young_person_identity_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE young_person_identity_profile
                    SET
                        interests = %(interests)s,
                        strengths_summary = %(strengths_summary)s,
                        what_matters_to_me = %(what_matters_to_me)s
                    WHERE id = %(id)s
                    RETURNING *
                    """,
                    {
                        "id": existing["id"],
                        "interests": payload.get("interests"),
                        "strengths_summary": payload.get("strengths_summary"),
                        "what_matters_to_me": payload.get("what_matters_to_me"),
                    },
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_identity_profile (
                        young_person_id,
                        interests,
                        strengths_summary,
                        what_matters_to_me
                    )
                    VALUES (
                        %(young_person_id)s,
                        %(interests)s,
                        %(strengths_summary)s,
                        %(what_matters_to_me)s
                    )
                    RETURNING *
                    """,
                    {
                        "young_person_id": young_person_id,
                        "interests": payload.get("interests"),
                        "strengths_summary": payload.get("strengths_summary"),
                        "what_matters_to_me": payload.get("what_matters_to_me"),
                    },
                )

            row = cur.fetchone()

        conn.commit()
        return row

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update identity profile: {str(e)}")
