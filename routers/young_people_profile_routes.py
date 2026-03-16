from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Profile"])


@router.get("/{young_person_id}/profile")
def get_young_person_profile(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            # Young person core
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
                    ypls.*
                FROM young_person_legal_status ypls
                WHERE ypls.young_person_id = %s
                ORDER BY
                    COALESCE(ypls.is_current, FALSE) DESC,
                    ypls.effective_from DESC NULLS LAST,
                    ypls.id DESC
                """,
                (young_person_id,),
            )
            legal_status = cur.fetchall()

            # Communication profile
            cur.execute(
                """
                SELECT
                    ypcp.*
                FROM young_person_communication_profile ypcp
                WHERE ypcp.young_person_id = %s
                ORDER BY ypcp.id DESC
                """,
                (young_person_id,),
            )
            communication_profile = cur.fetchall()

            # Identity profile
            cur.execute(
                """
                SELECT
                    ypip.*
                FROM young_person_identity_profile ypip
                WHERE ypip.young_person_id = %s
                ORDER BY ypip.id DESC
                """,
                (young_person_id,),
            )
            identity_profile = cur.fetchall()

            # Alerts
            cur.execute(
                """
                SELECT
                    a.*,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM young_person_alerts a
                LEFT JOIN users u
                    ON a.created_by = u.id
                WHERE a.young_person_id = %s
                ORDER BY
                    COALESCE(a.is_active, TRUE) DESC,
                    CASE
                        WHEN LOWER(COALESCE(a.severity, '')) = 'high' THEN 1
                        WHEN LOWER(COALESCE(a.severity, '')) = 'medium' THEN 2
                        WHEN LOWER(COALESCE(a.severity, '')) = 'low' THEN 3
                        ELSE 4
                    END,
                    a.review_date ASC NULLS LAST,
                    a.id DESC
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
