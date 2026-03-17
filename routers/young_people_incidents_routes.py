from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field, ConfigDict

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Incidents"])


# =========================================================
# Helpers
# =========================================================

def now_utc():
    return datetime.utcnow()


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def full_name(first_name, last_name):
    return " ".join([x for x in [first_name, last_name] if x]).strip() or None


def normalise_review_status(value: Optional[str]) -> str:
    v = (value or "").strip().lower()
    if v in {"pending", "submitted", "approved", "returned", "reviewed", "closed", "archived"}:
        return v
    return "pending"


def normalise_severity(value: Optional[str]) -> str:
    v = (value or "").strip().lower()
    if v in {"low", "medium", "high", "critical"}:
        return v
    return "medium"


def incident_status_for_ui(row: dict) -> str:
    review_status = normalise_review_status(row.get("manager_review_status"))
    if review_status == "pending":
        return "submitted"
    if review_status == "reviewed":
        return "approved"
    return review_status


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


def transform_incident_row(row: dict) -> dict:
    staff_name = full_name(row.get("staff_first_name"), row.get("staff_last_name"))
    workflow_status = incident_status_for_ui(row)
    severity = normalise_severity(row.get("severity"))

    # Working aliases so the OS shell and event workspace can consume it
    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "incident_datetime": row.get("incident_datetime"),
        "occurred_at": row.get("incident_datetime"),
        "incident_type": row.get("incident_type"),
        "event_type": "incident",
        "severity": severity,
        "risk_level": severity if severity in {"low", "medium", "high"} else "high",
        "location": row.get("location"),
        "description": row.get("description"),
        "narrative": row.get("description"),
        "manager_review_status": normalise_review_status(row.get("manager_review_status")),
        "workflow_status": workflow_status,
        "follow_up_required": row.get("follow_up_required"),
        "outcome": row.get("follow_up_required"),
        "staff_id": row.get("staff_id"),
        "staff_name": staff_name,
        "archived": row.get("archived"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),

        # richer shell fields
        "title": f"{(row.get('incident_type') or 'Incident').replace('_', ' ').title()}",
        "antecedent": None,
        "presentation": None,
        "staff_response": None,
        "trauma_informed_formulation": None,
        "child_voice": None,
        "restorative_follow_up": row.get("follow_up_required"),
        "requires_manager_review": True,
        "quality_standards": ["protection_of_children"],
        "judgement_areas": ["helped_and_protected"],
        "version_no": 1,
    }


def fetch_incident_by_id(cur, incident_id: int):
    cur.execute(
        fetch_incident_select_sql("WHERE i.id = %s LIMIT 1"),
        (incident_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    return row


# =========================================================
# Request models
# =========================================================

class IncidentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    young_person_id: int
    incident_datetime: Optional[str] = None
    incident_type: str
    severity: Optional[str] = "medium"
    location: Optional[str] = None
    description: Optional[str] = None
    manager_review_status: Optional[str] = "pending"
    follow_up_required: Optional[str] = None
    staff_id: Optional[int] = None
    archived: Optional[bool] = False

    # OS shell aliases
    title: Optional[str] = None
    narrative: Optional[str] = Field(default=None, alias="narrative")
    occurred_at: Optional[str] = Field(default=None, alias="occurred_at")
    risk_level: Optional[str] = Field(default=None, alias="risk_level")
    outcome: Optional[str] = Field(default=None, alias="outcome")
    restorative_follow_up: Optional[str] = Field(default=None, alias="restorative_follow_up")
    workflow_status: Optional[str] = Field(default=None, alias="workflow_status")
    child_voice: Optional[str] = None
    antecedent: Optional[str] = None
    presentation: Optional[str] = None
    staff_response: Optional[str] = None
    trauma_informed_formulation: Optional[str] = None


class IncidentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    incident_datetime: Optional[str] = None
    incident_type: Optional[str] = None
    severity: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    manager_review_status: Optional[str] = None
    follow_up_required: Optional[str] = None
    staff_id: Optional[int] = None
    archived: Optional[bool] = None

    # OS shell aliases
    title: Optional[str] = None
    narrative: Optional[str] = Field(default=None, alias="narrative")
    occurred_at: Optional[str] = Field(default=None, alias="occurred_at")
    risk_level: Optional[str] = Field(default=None, alias="risk_level")
    outcome: Optional[str] = Field(default=None, alias="outcome")
    restorative_follow_up: Optional[str] = Field(default=None, alias="restorative_follow_up")
    workflow_status: Optional[str] = Field(default=None, alias="workflow_status")
    child_voice: Optional[str] = None
    antecedent: Optional[str] = None
    presentation: Optional[str] = None
    staff_response: Optional[str] = None
    trauma_informed_formulation: Optional[str] = None


class IncidentReturnPayload(BaseModel):
    review_note: Optional[str] = None


# =========================================================
# Read routes
# =========================================================

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
                      AND LOWER(COALESCE(i.manager_review_status, 'pending')) NOT IN ('closed', 'archived')
                    ORDER BY i.incident_datetime DESC, i.created_at DESC, i.id DESC
                    """
                ),
                (young_person_id,),
            )
            rows = cur.fetchall() or []
            return {"items": [transform_incident_row(r) for r in rows]}
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
                        OR LOWER(COALESCE(i.manager_review_status, '')) IN ('closed', 'archived')
                      )
                    ORDER BY i.incident_datetime DESC, i.created_at DESC, i.id DESC
                    """
                ),
                (young_person_id,),
            )
            rows = cur.fetchall() or []
            return {"items": [transform_incident_row(r) for r in rows]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived incidents: {str(e)}")


@router.get("/incidents/{incident_id}")
def get_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_incident_by_id(cur, incident_id)
            return transform_incident_row(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load incident: {str(e)}")


# =========================================================
# Create / update routes
# =========================================================

@router.post("/incidents")
def create_incident(payload: IncidentCreate, conn=Depends(get_db)):
    now = now_utc()

    incident_datetime = payload.incident_datetime or payload.occurred_at or now.isoformat()
    description = payload.description or payload.narrative
    follow_up_required = payload.follow_up_required or payload.outcome or payload.restorative_follow_up

    severity = payload.severity or payload.risk_level or "medium"

    workflow_status = (payload.workflow_status or "").strip().lower()
    manager_review_status = payload.manager_review_status
    if workflow_status == "submitted":
        manager_review_status = "pending"
    elif workflow_status == "approved":
        manager_review_status = "reviewed"
    elif workflow_status == "returned":
        manager_review_status = "returned"

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
        incident_datetime,
        payload.incident_type,
        normalise_severity(severity),
        payload.location,
        description,
        normalise_review_status(manager_review_status),
        follow_up_required,
        payload.staff_id,
        bool(payload.archived),
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
        return {"message": "Incident created successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create incident: {str(e)}")


@router.put("/incidents/{incident_id}")
def update_incident(incident_id: int, payload: IncidentUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True, by_alias=False)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    # Map OS shell aliases
    if "occurred_at" in update_data:
        update_data["incident_datetime"] = update_data.pop("occurred_at")

    if "narrative" in update_data:
        update_data["description"] = update_data.pop("narrative")

    if "risk_level" in update_data:
        update_data["severity"] = update_data.pop("risk_level")

    if "outcome" in update_data and "follow_up_required" not in update_data:
        update_data["follow_up_required"] = update_data.pop("outcome")
    elif "outcome" in update_data:
        update_data.pop("outcome")

    if "restorative_follow_up" in update_data and "follow_up_required" not in update_data:
        update_data["follow_up_required"] = update_data.pop("restorative_follow_up")
    elif "restorative_follow_up" in update_data:
        update_data.pop("restorative_follow_up")

    if "workflow_status" in update_data:
        workflow_status = (update_data.pop("workflow_status") or "").strip().lower()
        if workflow_status == "submitted":
            update_data["manager_review_status"] = "pending"
        elif workflow_status == "approved":
            update_data["manager_review_status"] = "reviewed"
        elif workflow_status == "returned":
            update_data["manager_review_status"] = "returned"

    # These fields are accepted by the editor but do not yet have backing columns
    for unsupported in [
        "title",
        "child_voice",
        "antecedent",
        "presentation",
        "staff_response",
        "trauma_informed_formulation",
    ]:
        update_data.pop(unsupported, None)

    if "severity" in update_data and update_data["severity"] is not None:
        update_data["severity"] = normalise_severity(update_data["severity"])

    if "manager_review_status" in update_data and update_data["manager_review_status"] is not None:
        update_data["manager_review_status"] = normalise_review_status(update_data["manager_review_status"])

    update_data["updated_at"] = now_utc()

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

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Incident not found")

        conn.commit()
        return {"message": "Incident updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update incident: {str(e)}")


# =========================================================
# Workflow routes
# =========================================================

@router.post("/incidents/{incident_id}/submit")
def submit_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_incident_by_id(cur, incident_id)

            cur.execute(
                """
                UPDATE incidents
                SET
                    manager_review_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("pending", now_utc(), incident_id),
            )
            row = cur.fetchone()

        conn.commit()
        return {"ok": True, "status": "submitted", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit incident: {str(e)}")


@router.post("/incidents/{incident_id}/approve")
def approve_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_incident_by_id(cur, incident_id)

            cur.execute(
                """
                UPDATE incidents
                SET
                    manager_review_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("reviewed", now_utc(), incident_id),
            )
            row = cur.fetchone()

        conn.commit()
        return {"ok": True, "status": "approved", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve incident: {str(e)}")


@router.post("/incidents/{incident_id}/return")
def return_incident(incident_id: int, payload: IncidentReturnPayload, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_incident_by_id(cur, incident_id)

            cur.execute(
                """
                UPDATE incidents
                SET
                    manager_review_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("returned", now_utc(), incident_id),
            )
            row = cur.fetchone()

        conn.commit()
        return {
            "ok": True,
            "status": "returned",
            "id": row["id"],
            "review_note": payload.review_note or "",
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return incident: {str(e)}")


@router.post("/incidents/{incident_id}/archive")
def archive_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            fetch_incident_by_id(cur, incident_id)

            cur.execute(
                """
                UPDATE incidents
                SET
                    archived = TRUE,
                    manager_review_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", now_utc(), incident_id),
            )
            row = cur.fetchone()

        conn.commit()
        return {"ok": True, "status": "archived", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive incident: {str(e)}")


# =========================================================
# Export route
# =========================================================

@router.get("/incidents/{incident_id}/export")
def export_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_incident_by_id(cur, incident_id)
            incident = transform_incident_row(row)

        text = f"""INDICARE INCIDENT EXPORT

Incident ID: {incident.get('id') or '—'}
Young person ID: {incident.get('young_person_id') or '—'}

Title: {incident.get('title') or '—'}
Incident type: {incident.get('incident_type') or '—'}
Occurred at: {incident.get('occurred_at') or '—'}
Severity: {incident.get('severity') or '—'}
Location: {incident.get('location') or '—'}

Description
{incident.get('description') or '—'}

Follow-up required
{incident.get('follow_up_required') or '—'}

Manager review status: {incident.get('manager_review_status') or '—'}
Workflow status: {incident.get('workflow_status') or '—'}
Recorded by: {incident.get('staff_name') or '—'}

Created at: {incident.get('created_at') or '—'}
Updated at: {incident.get('updated_at') or '—'}
"""

        return PlainTextResponse(
            content=text,
            headers={
                "Content-Disposition": f'inline; filename="incident-{incident_id}.txt"'
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export incident: {str(e)}")
