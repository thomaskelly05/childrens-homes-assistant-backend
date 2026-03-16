from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Risk"])


@router.get("/{young_person_id}/risk")
def get_young_person_risk(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:

            # Ensure young person exists
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

            # Risk assessments
            cur.execute(
                """
                SELECT
                    ra.id,
                    ra.young_person_id,
                    ra.category,
                    ra.title,
                    ra.concern_summary,
                    ra.trigger_factors,
                    ra.known_patterns,
                    ra.current_controls,
                    ra.additional_controls,
                    ra.severity,
                    ra.likelihood,
                    ra.review_date,
                    ra.status,
                    ra.approval_status,
                    ra.owner_id,
                    ra.created_by,
                    ra.created_at,
                    ra.updated_at,
                    u.first_name AS owner_first_name,
                    u.last_name AS owner_last_name,
                    c.first_name AS created_by_first_name,
                    c.last_name AS created_by_last_name
                FROM risk_assessments ra
                LEFT JOIN users u
                    ON ra.owner_id = u.id
                LEFT JOIN users c
                    ON ra.created_by = c.id
                WHERE ra.young_person_id = %s
                  AND COALESCE(ra.archived, FALSE) = FALSE
                ORDER BY
                    CASE
                        WHEN LOWER(COALESCE(ra.severity, '')) = 'high' THEN 1
                        WHEN LOWER(COALESCE(ra.severity, '')) = 'medium' THEN 2
                        WHEN LOWER(COALESCE(ra.severity, '')) = 'low' THEN 3
                        ELSE 4
                    END,
                    ra.review_date ASC NULLS LAST,
                    ra.id DESC
                """,
                (young_person_id,),
            )

            risk_assessments = cur.fetchall()

        return risk_assessments

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load risk assessments: {str(e)}"
        )
