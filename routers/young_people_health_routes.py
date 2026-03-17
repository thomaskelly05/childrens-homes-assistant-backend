from fastapi import APIRouter, Depends, HTTPException, Body
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Health"])


@router.get("/{young_person_id}/health")
def get_young_person_health(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
            yp = cur.fetchone()
            if not yp:
                raise HTTPException(status_code=404, detail="Young person not found")

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
                SELECT
                    hr.id,
                    hr.young_person_id,
                    hr.record_type,
                    hr.title,
                    hr.summary,
                    hr.professional_name,
                    hr.outcome,
                    hr.follow_up_required,
                    hr.next_action_date,
                    hr.event_datetime,
                    hr.created_by,
                    hr.created_at,
                    hr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM health_records hr
                LEFT JOIN users u ON hr.created_by = u.id
                WHERE hr.young_person_id = %s
                ORDER BY COALESCE(hr.event_datetime, hr.created_at) DESC, hr.id DESC
                """,
                (young_person_id,),
            )
            health_records = cur.fetchall()

            cur.execute(
                """
                SELECT *
                FROM medication_profiles
                WHERE young_person_id = %s
                ORDER BY is_active DESC, start_date DESC NULLS LAST, id DESC
                """,
                (young_person_id,),
            )
            medication_profiles = cur.fetchall()

            cur.execute(
                """
                SELECT
                    mr.id,
                    mr.young_person_id,
                    mr.medication_name,
                    mr.dose,
                    mr.route,
                    mr.status,
                    mr.error_flag,
                    mr.scheduled_time,
                    mr.administered_time,
                    mr.administered_by,
                    mr.created_at,
                    mr.updated_at,
                    u.first_name AS administered_by_first_name,
                    u.last_name AS administered_by_last_name
                FROM medication_records mr
                LEFT JOIN users u ON mr.administered_by = u.id
                WHERE mr.young_person_id = %s
                ORDER BY COALESCE(mr.scheduled_time, mr.created_at) DESC, mr.id DESC
                """,
                (young_person_id,),
            )
            medication_records = cur.fetchall()

        return {
            "health_profile": health_profile,
            "health_records": health_records,
            "medication_profiles": medication_profiles,
            "medication_records": medication_records,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load health data: {str(e)}")


@router.put("/{young_person_id}/health/profile")
def upsert_health_profile(
    young_person_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM young_person_health_profile
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
                    UPDATE young_person_health_profile
                    SET
                        gp_name = %(gp_name)s,
                        allergies = %(allergies)s,
                        diagnoses = %(diagnoses)s
                    WHERE id = %(id)s
                    RETURNING *
                    """,
                    {
                        "id": existing["id"],
                        "gp_name": payload.get("gp_name"),
                        "allergies": payload.get("allergies"),
                        "diagnoses": payload.get("diagnoses"),
                    },
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_health_profile (
                        young_person_id,
                        gp_name,
                        allergies,
                        diagnoses
                    )
                    VALUES (
                        %(young_person_id)s,
                        %(gp_name)s,
                        %(allergies)s,
                        %(diagnoses)s
                    )
                    RETURNING *
                    """,
                    {
                        "young_person_id": young_person_id,
                        "gp_name": payload.get("gp_name"),
                        "allergies": payload.get("allergies"),
                        "diagnoses": payload.get("diagnoses"),
                    },
                )

            row = cur.fetchone()

        conn.commit()
        return row

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update health profile: {str(e)}")
