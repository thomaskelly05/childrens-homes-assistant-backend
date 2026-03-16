from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Family"])


@router.get("/{young_person_id}/family")
def get_young_person_family(
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

            # Family / contact list
            cur.execute(
                """
                SELECT
                    c.*
                FROM young_person_contacts c
                WHERE c.young_person_id = %s
                ORDER BY
                    COALESCE(c.is_parental_responsibility_holder, FALSE) DESC,
                    COALESCE(c.is_approved_contact, FALSE) DESC,
                    c.full_name ASC,
                    c.id DESC
                """,
                (young_person_id,),
            )
            contacts = cur.fetchall()

            # Family contact records
            cur.execute(
                """
                SELECT
                    fcr.id,
                    fcr.young_person_id,
                    fcr.contact_datetime,
                    fcr.contact_type,
                    fcr.contact_person,
                    fcr.supervision_level,
                    fcr.location,
                    fcr.pre_contact_presentation,
                    fcr.post_contact_presentation,
                    fcr.child_voice,
                    fcr.concerns,
                    fcr.follow_up_required,
                    fcr.created_by,
                    fcr.created_at,
                    fcr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM family_contact_records fcr
                LEFT JOIN users u
                    ON fcr.created_by = u.id
                WHERE fcr.young_person_id = %s
                ORDER BY COALESCE(fcr.contact_datetime, fcr.created_at) DESC, fcr.id DESC
                """,
                (young_person_id,),
            )
            family_contact_records = cur.fetchall()

        return {
            "contacts": contacts,
            "family_contact_records": family_contact_records,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load family data: {str(e)}"
        )
