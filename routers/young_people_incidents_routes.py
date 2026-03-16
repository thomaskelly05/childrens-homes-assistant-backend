from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Incidents"])


@router.get("/{young_person_id}/incidents")
def get_young_person_incidents(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM young_people
                WHERE id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            yp = cur.fetchone()

            if not yp:
                raise HTTPException(status_code=404, detail="Young person not found")

            cur.execute(
                """
                SELECT
                    i.id,
                    i.home_id,
                    i.young_person_id,
                    i.staff_id,
                    i.incident_type,
                    i.description,
                    i.incident_datetime,
                    i.location,
                    i.antecedent,
                    i.staff_response,
                    i.child_response,
                    i.outcome,
                    i.injury_flag,
                    i.property_damage_flag,
                    i.police_involved,
                    i.safeguarding_flag,
                    i.severity,
                    i.manager_review_required,
                    i.manager_review_status,
                    i.follow_up_required,
                    i.created_at,
                    i.updated_at,
                    u.first_name AS staff_first_name,
                    u.last_name AS staff_last_name
                FROM incidents i
                LEFT JOIN users u
                    ON i.staff_id = u.id
                WHERE i.young_person_id = %s
                ORDER BY COALESCE(i.incident_datetime, i.created_at) DESC, i.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall()

        return rows

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load incidents: {str(e)}"
        )
