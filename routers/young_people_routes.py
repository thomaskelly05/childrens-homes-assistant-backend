from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from db.connection import engine

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
def list_young_people(home_id: int | None = None, archived: bool = False):
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
        WHERE yp.archived = :archived
    """
    params = {"archived": archived}

    if home_id is not None:
        query += " AND yp.home_id = :home_id"
        params["home_id"] = home_id

    query += " ORDER BY yp.first_name ASC, yp.last_name ASC"

    with engine.connect() as conn:
        rows = conn.execute(text(query), params).mappings().all()

    return [dict(row) for row in rows]


@router.get("/{young_person_id}")
def get_young_person(young_person_id: int):
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
        WHERE yp.id = :young_person_id
        LIMIT 1
    """

    with engine.connect() as conn:
        row = conn.execute(
            text(query),
            {"young_person_id": young_person_id},
        ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")

    return dict(row)


@router.post("")
def create_young_person(payload: YoungPersonCreate):
    now = datetime.utcnow()

    query = text("""
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
        VALUES (
            :home_id,
            :first_name,
            :last_name,
            :preferred_name,
            :date_of_birth,
            :gender,
            :ethnicity,
            :nhs_number,
            :local_id_number,
            :admission_date,
            :discharge_date,
            :placement_status,
            :primary_keyworker_id,
            :summary_risk_level,
            :photo_url,
            :archived,
            :created_at,
            :updated_at
        )
        RETURNING id
    """)

    values = {
        "home_id": payload.home_id,
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "preferred_name": payload.preferred_name,
        "date_of_birth": payload.date_of_birth,
        "gender": payload.gender,
        "ethnicity": payload.ethnicity,
        "nhs_number": payload.nhs_number,
        "local_id_number": payload.local_id_number,
        "admission_date": payload.admission_date,
        "discharge_date": payload.discharge_date,
        "placement_status": payload.placement_status,
        "primary_keyworker_id": payload.primary_keyworker_id,
        "summary_risk_level": payload.summary_risk_level,
        "photo_url": payload.photo_url,
        "archived": payload.archived,
        "created_at": now,
        "updated_at": now,
    }

    with engine.begin() as conn:
        new_id = conn.execute(query, values).scalar()

    return {
        "message": "Young person created successfully",
        "id": new_id,
    }


@router.put("/{young_person_id}")
def update_young_person(young_person_id: int, payload: YoungPersonUpdate):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()
    update_data["young_person_id"] = young_person_id

    set_parts = [
        f"{field} = :{field}"
        for field in update_data.keys()
        if field != "young_person_id"
    ]
    set_clause = ", ".join(set_parts)

    query = text(f"""
        UPDATE young_people
        SET {set_clause}
        WHERE id = :young_person_id
        RETURNING id
    """)

    with engine.begin() as conn:
        updated = conn.execute(query, update_data).scalar()

    if not updated:
        raise HTTPException(status_code=404, detail="Young person not found")

    return {
        "message": "Young person updated successfully",
        "id": young_person_id,
    }


@router.delete("/{young_person_id}")
def archive_young_person(young_person_id: int):
    query = text("""
        UPDATE young_people
        SET archived = TRUE,
            updated_at = :updated_at
        WHERE id = :young_person_id
        RETURNING id
    """)

    with engine.begin() as conn:
        updated = conn.execute(
            query,
            {
                "young_person_id": young_person_id,
                "updated_at": datetime.utcnow(),
            },
        ).scalar()

    if not updated:
        raise HTTPException(status_code=404, detail="Young person not found")

    return {
        "message": "Young person archived successfully",
        "id": young_person_id,
    }
