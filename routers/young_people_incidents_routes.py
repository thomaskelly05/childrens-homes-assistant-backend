from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Incidents"])


class IncidentCreate(BaseModel):
    young_person_id: int
    incident_datetime: str
    incident_type: str
    severity: str | None = "medium"
    location: str | None = None
    description: str | None = None
    manager_review_status: str | None = "pending"
    follow_up_required: str | None = None
    staff_id: int | None = None
    archived: bool | None = False


class IncidentUpdate(BaseModel):
    incident_datetime: str | None = None
    incident_type: str | None = None
    severity: str | None = None
    location: str | None = None
    description: str | None = None
    manager_review_status: str | None = None
    follow_up_required: str | None = None
    staff_id: int | None = None
    archived: bool | None = None


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def fetch_incident_select_sql(where_sql: str):
    return f"""
        SELECT
            i.id,
            i.young_person_id,
            i.incident_datetime,
            i.incident_type,
            i.severity,
            i.location,
            i.description,
            i.manager_review_status,
            i.follow_up_required,
            i.staff_id,
            i.archived,
            i.created_at,
            i.updated_at,
            s.first_name AS staff_first_name,
            s.last_name AS staff_last_name
        FROM incidents i
        LEFT JOIN users s ON i.staff_id = s.id
        {where_sql}
    """


@router.get("/{young_person_id}/incidents")
def get_young_person_incidents(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_incident_select_sql(
                    """
                    WHERE i.young_person_id = %s
                      AND COALESCE(i.archived, FALSE) = FALSE
                      AND LOWER(COALESCE(i.manager_review_status, 'pending')) NOT IN ('reviewed', 'closed', 'archived', 'completed')
                    ORDER BY i.incident_datetime DESC, i.created_at DESC, i.id DESC
                    """
                ),
                (young_person_id,),
            )
            return cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load incidents: {str(e)}")


@router.get("/{young_person_id}/incidents/archive")
def get_young_person_archived_incidents(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_incident_select_sql(
                    """
                    WHERE i.young_person_id = %s
                      AND (
                        COALESCE(i.archived, FALSE) = TRUE
                        OR LOWER(COALESCE(i.manager_review_status, '')) IN ('reviewed', 'closed', 'archived', 'completed')
                      )
                    ORDER BY i.incident_datetime DESC, i.created_at DESC, i.id DESC
                    """
                ),
                (young_person_id,),
            )
            return cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived incidents: {str(e)}")


@router.get("/incidents/{incident_id}")
def get_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                fetch_incident_select_sql("WHERE i.id = %s LIMIT 1"),
                (incident_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")

        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load incident: {str(e)}")


@router.post("/incidents")
def create_incident(payload: IncidentCreate, conn=Depends(get_db)):
    now = datetime.utcnow()

    query = """
        INSERT INTO incidents (
            young_person_id,
            incident_datetime,
            incident_type,
            severity,
            location,
            description,
            manager_review_status,
            follow_up_required,
            staff_id,
            archived,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.incident_datetime,
        payload.incident_type,
        payload.severity,
        payload.location,
        payload.description,
        payload.manager_review_status,
        payload.follow_up_required,
        payload.staff_id,
        payload.archived,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
        return {"message": "Incident created successfully", "id": row["id"]}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create incident: {str(e)}")


@router.put("/incidents/{incident_id}")
def update_incident(incident_id: int, payload: IncidentUpdate, conn=Depends(get_db)):
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
            row = cur.fetchone()
        conn.commit()

        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")

        return {"message": "Incident updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update incident: {str(e)}")
