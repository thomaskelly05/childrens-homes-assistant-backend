from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Daily Notes"])


@router.get("/{young_person_id}/daily-notes")
def get_young_person_daily_notes(
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
                    dn.id,
                    dn.young_person_id,
                    dn.home_id,
                    dn.note_date,
                    dn.shift_type,
                    dn.mood,
                    dn.presentation,
                    dn.activities,
                    dn.education_update,
                    dn.health_update,
                    dn.family_update,
                    dn.behaviour_update,
                    dn.young_person_voice,
                    dn.positives,
                    dn.actions_required,
                    dn.significance,
                    dn.workflow_status,
                    dn.manager_review_comment,
                    dn.approved_by,
                    dn.approved_at,
                    dn.returned_at,
                    dn.submitted_at,
                    dn.last_edited_at,
                    dn.author_id,
                    dn.created_at,
                    dn.updated_at,
                    u.first_name AS author_first_name,
                    u.last_name AS author_last_name,
                    a.first_name AS approved_by_first_name,
                    a.last_name AS approved_by_last_name
                FROM daily_notes dn
                LEFT JOIN users u
                    ON dn.author_id = u.id
                LEFT JOIN users a
                    ON dn.approved_by = a.id
                WHERE dn.young_person_id = %s
                ORDER BY dn.note_date DESC, dn.created_at DESC, dn.id DESC
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
            detail=f"Failed to load daily notes: {str(e)}"
        )
