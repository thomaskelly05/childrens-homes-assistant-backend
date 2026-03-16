from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Health"])


@router.get("/{young_person_id}/health")
def get_young_person_health(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:

            # Confirm young person exists
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

            # Health profile
            cur.execute(
                """
                SELECT
                    hp.*
                FROM young_person_health_profile hp
                WHERE hp.young_person_id = %s
                ORDER BY hp.id DESC
                """,
                (young_person_id,),
            )
            health_profile = cur.fetchall()

            # Health records
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
                LEFT JOIN users u
                    ON hr.created_by = u.id
                WHERE hr.young_person_id = %s
                ORDER BY COALESCE(hr.event_datetime, hr.created_at) DESC, hr.id DESC
                """,
                (young_person_id,),
            )
            health_records = cur.fetchall()

            # Medication profiles
            cur.execute(
                """
                SELECT
                    mp.*
                FROM medication_profiles mp
                WHERE mp.young_person_id = %s
                ORDER BY mp.is_active DESC, mp.start_date DESC NULLS LAST, mp.id DESC
                """,
                (young_person_id,),
            )
            medication_profiles = cur.fetchall()

            # Medication records
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
                LEFT JOIN users u
                    ON mr.administered_by = u.id
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
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load health data: {str(e)}"
        )
