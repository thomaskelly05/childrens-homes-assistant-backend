from fastapi import APIRouter, Depends, HTTPException, Body
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Family"])


@router.get("/{young_person_id}/family")
def get_young_person_family(
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
                FROM young_person_contacts
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(is_parental_responsibility_holder, FALSE) DESC,
                    COALESCE(is_approved_contact, FALSE) DESC,
                    full_name ASC,
                    id DESC
                """,
                (young_person_id,),
            )
            contacts = cur.fetchall()

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
                LEFT JOIN users u ON fcr.created_by = u.id
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
        raise HTTPException(status_code=500, detail=f"Failed to load family data: {str(e)}")


@router.post("/{young_person_id}/family/contacts")
def create_family_contact(
    young_person_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO young_person_contacts (
                    young_person_id,
                    full_name,
                    relationship_to_child,
                    phone_number,
                    email,
                    address,
                    is_parental_responsibility_holder,
                    is_approved_contact,
                    contact_notes
                )
                VALUES (
                    %(young_person_id)s,
                    %(full_name)s,
                    %(relationship_to_child)s,
                    %(phone_number)s,
                    %(email)s,
                    %(address)s,
                    %(is_parental_responsibility_holder)s,
                    %(is_approved_contact)s,
                    %(contact_notes)s
                )
                RETURNING *
                """,
                {**payload, "young_person_id": young_person_id},
            )
            row = cur.fetchone()

        conn.commit()
        return row

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create contact: {str(e)}")


@router.put("/family/contacts/{contact_id}")
def update_family_contact(
    contact_id: int,
    payload: dict = Body(...),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_person_contacts
                SET
                    full_name = %(full_name)s,
                    relationship_to_child = %(relationship_to_child)s,
                    phone_number = %(phone_number)s,
                    email = %(email)s,
                    address = %(address)s,
                    is_parental_responsibility_holder = %(is_parental_responsibility_holder)s,
                    is_approved_contact = %(is_approved_contact)s,
                    contact_notes = %(contact_notes)s
                WHERE id = %(id)s
                RETURNING *
                """,
                {**payload, "id": contact_id},
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Contact not found")

        conn.commit()
        return row

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update contact: {str(e)}")
