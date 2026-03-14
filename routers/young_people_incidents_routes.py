from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Incidents"])


class IncidentCreate(BaseModel):
    young_person_id: int | None = None
    home_id: int | None = None
    staff_id: int | None = None
    incident_type: str | None = None
    description: str | None = None
    incident_datetime: str | None = None
    location: str | None = None
    antecedent: str | None = None
    staff_response: str | None = None
    child_response: str | None = None
    outcome: str | None = None
    injury_flag: bool = False
    property_damage_flag: bool = False
    police_involved: bool = False
    safeguarding_flag: bool = False
    severity: str = "medium"
    manager_review_required: bool = True
    manager_review_status: str = "pending"
    follow_up_required: bool = False


class IncidentUpdate(BaseModel):
    young_person_id: int | None = None
    home_id: int | None = None
    staff_id: int | None = None
    incident_type: str | None = None
    description: str | None = None
    incident_datetime: str | None = None
    location: str | None = None
    antecedent: str | None = None
    staff_response: str | None = None
    child_response: str | None = None
    outcome: str | None = None
    injury_flag: bool | None = None
    property_damage_flag: bool | None = None
    police_involved: bool | None = None
    safeguarding_flag: bool | None = None
    severity: str | None = None
    manager_review_required: bool | None = None
    manager_review_status: str | None = None
    follow_up_required: bool | None = None


@router.get("/{young_person_id}/incidents")
def list_incidents(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            i.*,
            u.first_name AS staff_first_name,
            u.last_name AS staff_last_name
        FROM incidents i
        LEFT JOIN users u ON i.staff_id = u.id
        WHERE i.young_person_id = %s
        ORDER BY i.incident_datetime DESC NULLS LAST, i.created_at DESC NULLS LAST, i.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/incidents/{incident_id}")
def get_incident(
    incident_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            i.*,
            u.first_name AS staff_first_name,
            u.last_name AS staff_last_name
        FROM incidents i
        LEFT JOIN users u ON i.staff_id = u.id
        WHERE i.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (incident_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")

    return row


@router.post("/incidents")
def create_incident(
    payload: IncidentCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO incidents (
            young_person_id,
            home_id,
            staff_id,
            incident_type,
            description,
            created_at,
            incident_datetime,
            location,
            antecedent,
            staff_response,
            child_response,
            outcome,
            injury_flag,
            property_damage_flag,
            police_involved,
            safeguarding_flag,
            severity,
            manager_review_required,
            manager_review_status,
            follow_up_required,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.home_id,
        payload.staff_id,
        payload.incident_type,
        payload.description,
        now,
        payload.incident_datetime,
        payload.location,
        payload.antecedent,
        payload.staff_response,
        payload.child_response,
        payload.outcome,
        payload.injury_flag,
        payload.property_damage_flag,
        payload.police_involved,
        payload.safeguarding_flag,
        payload.severity,
        payload.manager_review_required,
        payload.manager_review_status,
        payload.follow_up_required,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create incident: {str(e)}")

    return {"message": "Incident created successfully", "id": new_row["id"]}


@router.put("/incidents/{incident_id}")
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
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

    values.append(incident_id)

    query = f"""
        UPDATE incidents
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
        raise HTTPException(status_code=500, detail=f"Failed to update incident: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Incident not found")

    return {"message": "Incident updated successfully", "id": updated_row["id"]}
