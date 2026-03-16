from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Plans"])


@router.get("/{young_person_id}/plans")
def get_young_person_plans(
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

            # Support plans
            cur.execute(
                """
                SELECT
                    sp.id,
                    sp.young_person_id,
                    sp.plan_type,
                    sp.title,
                    sp.presenting_need,
                    sp.risk_context,
                    sp.plan_objectives,
                    sp.strategies,
                    sp.child_voice,
                    sp.review_date,
                    sp.status,
                    sp.approval_status,
                    sp.owner_id,
                    sp.created_by,
                    sp.created_at,
                    sp.updated_at,
                    u.first_name AS owner_first_name,
                    u.last_name AS owner_last_name,
                    c.first_name AS created_by_first_name,
                    c.last_name AS created_by_last_name
                FROM support_plans sp
                LEFT JOIN users u
                    ON sp.owner_id = u.id
                LEFT JOIN users c
                    ON sp.created_by = c.id
                WHERE sp.young_person_id = %s
                  AND COALESCE(sp.archived, FALSE) = FALSE
                ORDER BY
                    CASE
                        WHEN LOWER(COALESCE(sp.status, '')) = 'active' THEN 1
                        WHEN LOWER(COALESCE(sp.status, '')) = 'draft' THEN 2
                        ELSE 3
                    END,
                    sp.review_date ASC NULLS LAST,
                    sp.id DESC
                """,
                (young_person_id,),
            )
            plans = cur.fetchall()

        return plans

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load young person plans: {str(e)}"
        )
