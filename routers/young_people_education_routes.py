from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Education"])


class EducationRecordCreate(BaseModel):
    young_person_id: int
    record_date: str
    attendance_status: str | None = None
    provision_name: str | None = None
    behaviour_summary: str | None = None
    learning_engagement: str | None = None
    issue_raised: str | None = None
    action_taken: str | None = None
    professional_involved: str | None = None
    achievement_note: str | None = None
    created_by: int | None = None


class EducationRecordUpdate(BaseModel):
    record_date: str | None = None
    attendance_status: str | None = None
    provision_name: str | None = None
    behaviour_summary: str | None = None
    learning_engagement: str | None = None
    issue_raised: str | None = None
    action_taken: str | None = None
    professional_involved: str | None = None
    achievement_note: str | None = None
    created_by: int | None = None


@router.get("/{young_person_id}/education")
def list_education_records(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            er.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM education_records er
        LEFT JOIN users u ON er.created_by = u.id
        WHERE er.young_person_id = %s
        ORDER BY er.record_date DESC, er.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/education-records/{education_record_id}")
def get_education_record(
    education_record_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            er.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM education_records er
        LEFT JOIN users u ON er.created_by = u.id
        WHERE er.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (education_record_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Education record not found")

    return row


@router.post("/education-records")
def create_education_record(
    payload: EducationRecordCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO education_records (
            young_person_id,
            record_date,
            attendance_status,
            provision_name,
            behaviour_summary,
            learning_engagement,
            issue_raised,
            action_taken,
            professional_involved,
            achievement_note,
            created_by,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.record_date,
        payload.attendance_status,
        payload.provision_name,
        payload.behaviour_summary,
        payload.learning_engagement,
        payload.issue_raised,
        payload.action_taken,
        payload.professional_involved,
        payload.achievement_note,
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
        raise HTTPException(status_code=500, detail=f"Failed to create education record: {str(e)}")

    return {"message": "Education record created successfully", "id": new_row["id"]}


@router.put("/education-records/{education_record_id}")
def update_education_record(
    education_record_id: int,
    payload: EducationRecordUpdate,
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

    values.append(education_record_id)

    query = f"""
        UPDATE education_records
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
        raise HTTPException(status_code=500, detail=f"Failed to update education record: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Education record not found")

    return {"message": "Education record updated successfully", "id": updated_row["id"]}
