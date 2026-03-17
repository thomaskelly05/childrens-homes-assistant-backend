from fastapi import APIRouter, Depends, HTTPException, Body
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Education"])


@router.get("/{young_person_id}/education")
def get_young_person_education(
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
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                """,
                (young_person_id,),
            )
            education_profile = cur.fetchall()

            cur.execute(
                """
                SELECT
                    er.id,
                    er.young_person_id,
                    er.record_date,
                    er.attendance_status,
                    er.provision_name,
                    er.behaviour_summary,
                    er.learning_engagement,
                    er.issue_raised,
                    er.action_taken,
                    er.professional_involved,
                    er.achievement_note,
                    er.created_by,
                    er.created_at,
                    er.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM education_records er
                LEFT JOIN users u ON er.created_by = u.id
                WHERE er.young_person_id = %s
                ORDER BY er.record_date DESC NULLS LAST, er.created_at DESC, er.id DESC
                """,
                (young_person_id,),
            )
            education_records = cur.fetchall()

        return {
            "education_profile": education_profile,
            "education_records": education_records,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load education data: {str(e)}")


@router.put("/{young_person_id}/education/profile")
def upsert_education_profile(
    young_person_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM young_person_education_profile
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
                    UPDATE young_person_education_profile
                    SET
                        school_name = %(school_name)s,
                        year_group = %(year_group)s,
                        education_status = %(education_status)s
                    WHERE id = %(id)s
                    RETURNING *
                    """,
                    {
                        "id": existing["id"],
                        "school_name": payload.get("school_name"),
                        "year_group": payload.get("year_group"),
                        "education_status": payload.get("education_status"),
                    },
                )
            else:
                cur.execute(
                    """
                    INSERT INTO young_person_education_profile (
                        young_person_id,
                        school_name,
                        year_group,
                        education_status
                    )
                    VALUES (
                        %(young_person_id)s,
                        %(school_name)s,
                        %(year_group)s,
                        %(education_status)s
                    )
                    RETURNING *
                    """,
                    {
                        "young_person_id": young_person_id,
                        "school_name": payload.get("school_name"),
                        "year_group": payload.get("year_group"),
                        "education_status": payload.get("education_status"),
                    },
                )

            row = cur.fetchone()

        conn.commit()
        return row

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update education profile: {str(e)}")
