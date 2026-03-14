from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


class YoungPersonCreate(BaseModel):
    home_id: int
    first_name: str
    last_name: str
    preferred_name: str | None = None
    date_of_birth: str
    gender: str | None = None
    ethnicity: str | None = None
    nhs_number: str | None = None
    local_id_number: str | None = None
    admission_date: str
    discharge_date: str | None = None
    placement_status: str = "active"
    primary_keyworker_id: int | None = None
    summary_risk_level: str | None = None
    photo_url: str | None = None
    archived: bool = False


class YoungPersonUpdate(BaseModel):
    home_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    preferred_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    ethnicity: str | None = None
    nhs_number: str | None = None
    local_id_number: str | None = None
    admission_date: str | None = None
    discharge_date: str | None = None
    placement_status: str | None = None
    primary_keyworker_id: int | None = None
    summary_risk_level: str | None = None
    photo_url: str | None = None
    archived: bool | None = None


@router.get("")
def list_young_people(
    home_id: int | None = None,
    archived: bool = False,
    conn=Depends(get_db),
):
    query = """
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
            h.name AS home_name,
            u.first_name AS keyworker_first_name,
            u.last_name AS keyworker_last_name
        FROM young_people yp
        LEFT JOIN homes h ON yp.home_id = h.id
        LEFT JOIN users u ON yp.primary_keyworker_id = u.id
        WHERE yp.archived = %s
    """
    params = [archived]

    if home_id is not None:
        query += " AND yp.home_id = %s"
        params.append(home_id)

    query += " ORDER BY yp.first_name ASC, yp.last_name ASC"

    with conn.cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}")
def get_young_person(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
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
            h.name AS home_name,
            u.first_name AS keyworker_first_name,
            u.last_name AS keyworker_last_name
        FROM young_people yp
        LEFT JOIN homes h ON yp.home_id = h.id
        LEFT JOIN users u ON yp.primary_keyworker_id = u.id
        WHERE yp.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")

    return row


@router.post("")
def create_young_person(
    payload: YoungPersonCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO young_people (
            home_id,
            first_name,
            last_name,
            preferred_name,
            date_of_birth,
            gender,
            ethnicity,
            nhs_number,
            local_id_number,
            admission_date,
            discharge_date,
            placement_status,
            primary_keyworker_id,
            summary_risk_level,
            photo_url,
            archived,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.home_id,
        payload.first_name,
        payload.last_name,
        payload.preferred_name,
        payload.date_of_birth,
        payload.gender,
        payload.ethnicity,
        payload.nhs_number,
        payload.local_id_number,
        payload.admission_date,
        payload.discharge_date,
        payload.placement_status,
        payload.primary_keyworker_id,
        payload.summary_risk_level,
        payload.photo_url,
        payload.archived,
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
        raise HTTPException(status_code=500, detail=f"Failed to create young person: {str(e)}")

    return {
        "message": "Young person created successfully",
        "id": new_row["id"],
    }


@router.put("/{young_person_id}")
def update_young_person(
    young_person_id: int,
    payload: YoungPersonUpdate,
    conn=Depends(get_db),
):
    if hasattr(payload, "model_dump"):
        update_data = payload.model_dump(exclude_unset=True)
    else:
        update_data = payload.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(young_person_id)

    query = f"""
        UPDATE young_people
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
        raise HTTPException(status_code=500, detail=f"Failed to update young person: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Young person not found")

    return {
        "message": "Young person updated successfully",
        "id": updated_row["id"],
    }


@router.delete("/{young_person_id}")
def archive_young_person(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        UPDATE young_people
        SET archived = TRUE,
            updated_at = %s
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (datetime.utcnow(), young_person_id))
            updated_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive young person: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Young person not found")

    return {
        "message": "Young person archived successfully",
        "id": updated_row["id"],
    }
