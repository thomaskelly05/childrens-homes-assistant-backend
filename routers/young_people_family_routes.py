from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Family"])


class FamilyContactRecordCreate(BaseModel):
    young_person_id: int
    contact_datetime: str
    contact_type: str
    contact_person: str
    supervision_level: str | None = None
    location: str | None = None
    pre_contact_presentation: str | None = None
    post_contact_presentation: str | None = None
    child_voice: str | None = None
    concerns: str | None = None
    follow_up_required: bool = False
    created_by: int | None = None


class FamilyContactRecordUpdate(BaseModel):
    contact_datetime: str | None = None
    contact_type: str | None = None
    contact_person: str | None = None
    supervision_level: str | None = None
    location: str | None = None
    pre_contact_presentation: str | None = None
    post_contact_presentation: str | None = None
    child_voice: str | None = None
    concerns: str | None = None
    follow_up_required: bool | None = None
    created_by: int | None = None


@router.get("/{young_person_id}/family")
def list_family_contact_records(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            fcr.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM family_contact_records fcr
        LEFT JOIN users u ON fcr.created_by = u.id
        WHERE fcr.young_person_id = %s
        ORDER BY fcr.contact_datetime DESC, fcr.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/family-records/{family_record_id}")
def get_family_contact_record(
    family_record_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            fcr.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM family_contact_records fcr
        LEFT JOIN users u ON fcr.created_by = u.id
        WHERE fcr.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (family_record_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Family contact record not found")

    return row


@router.post("/family-records")
def create_family_contact_record(
    payload: FamilyContactRecordCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO family_contact_records (
            young_person_id,
            contact_datetime,
            contact_type,
            contact_person,
            supervision_level,
            location,
            pre_contact_presentation,
            post_contact_presentation,
            child_voice,
            concerns,
            follow_up_required,
            created_by,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.contact_datetime,
        payload.contact_type,
        payload.contact_person,
        payload.supervision_level,
        payload.location,
        payload.pre_contact_presentation,
        payload.post_contact_presentation,
        payload.child_voice,
        payload.concerns,
        payload.follow_up_required,
        payload.created_by,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create family contact record: {str(e)}")

    return {"message": "Family contact record created successfully", "id": new_row["id"]}


@router.put("/family-records/{family_record_id}")
def update_family_contact_record(
    family_record_id: int,
    payload: FamilyContactRecordUpdate,
    conn=Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(family_record_id)

    query = f"""
        UPDATE family_contact_records
        SET {", ".join(set_parts)}
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            updated_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update family contact record: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Family contact record not found")

    return {"message": "Family contact record updated successfully", "id": updated_row["id"]}
