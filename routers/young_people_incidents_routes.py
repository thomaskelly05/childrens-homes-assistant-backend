from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Incidents"])


# =========================================================
# Helpers
# =========================================================

def now_utc():
    return datetime.utcnow()


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute(
        "SELECT id FROM young_people WHERE id = %s LIMIT 1",
        (young_person_id,),
    )
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def full_name(first_name, last_name):
    return " ".join([x for x in [first_name, last_name] if x]).strip() or None


def has_column(cur, table_name: str, column_name: str) -> bool:
    cur.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = %s
        AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return bool(cur.fetchone())


def available_optional_columns(cur):
    possible = [
        "antecedent",
        "presentation",
        "staff_response",
        "trauma_informed_formulation",
        "child_voice",
        "restorative_follow_up",
        "outcome",
        "manager_review_comment",
        "approved_by",
        "approved_at",
        "returned_at",
        "submitted_at",
        "physical_intervention_used",
        "physical_intervention_type",
        "physical_intervention_duration_minutes",
        "physical_intervention_reason",
        "body_map_required",
        "body_map_json",
        "external_notification_required",
        "external_notification_details",
    ]
    return {c: has_column(cur, "incidents", c) for c in possible}


def normalise_severity(value: Optional[str]) -> str:
    v = (value or "").strip().lower()
    if v in {"low", "medium", "high", "critical"}:
        return v
    return "medium"


def normalise_review_status(value: Optional[str]) -> str:
    v = (value or "").strip().lower()
    if v in {"draft", "pending", "submitted", "approved", "returned", "reviewed", "archived", "closed"}:
        return v
    return "draft"


def ui_workflow_status(row: dict) -> str:
    review = normalise_review_status(row.get("manager_review_status"))
    if review == "pending":
        return "submitted"
    if review == "reviewed":
        return "approved"
    return review


INCIDENT_TYPE_OPTIONS = [
    "missing_from_placement",
    "physical_aggression",
    "verbal_aggression",
    "self_harm_concern",
    "safeguarding_concern",
    "absconding",
    "property_damage",
    "bullying",
    "substance_misuse",
    "relationship_incident",
    "health_incident",
    "medication_error",
    "physical_intervention",
    "restraint",
    "other",
]


def fetch_incident_select_sql(extra_select: str, where_sql: str):
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
        i.updated_at
        {extra_select},
        s.first_name AS staff_first_name,
        s.last_name AS staff_last_name
    FROM incidents i
    LEFT JOIN users s ON i.staff_id = s.id
    {where_sql}
    """


def build_extra_select(cols: dict) -> str:
    parts = []
    for col, exists in cols.items():
        if exists:
            parts.append(f"i.{col}")
        else:
            parts.append(f"NULL AS {col}")
    return ", " + ", ".join(parts) if parts else ""


def transform_incident_row(row: dict) -> dict:
    staff_name = full_name(row.get("staff_first_name"), row.get("staff_last_name"))
    workflow_status = ui_workflow_status(row)
    severity = normalise_severity(row.get("severity"))

    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "incident_datetime": row.get("incident_datetime"),
        "occurred_at": row.get("incident_datetime"),
        "incident_type": row.get("incident_type"),
        "incident_type_options": INCIDENT_TYPE_OPTIONS,
        "event_type": "incident",
        "title": (row.get("incident_type") or "incident").replace("_", " ").title(),
        "severity": severity,
        "risk_level": severity if severity in {"low", "medium", "high"} else "high",
        "location": row.get("location"),
        "description": row.get("description"),
        "narrative": row.get("description"),
        "manager_review_status": normalise_review_status(row.get("manager_review_status")),
        "workflow_status": workflow_status,
        "follow_up_required": row.get("follow_up_required"),
        "outcome": row.get("outcome") or row.get("follow_up_required"),
        "staff_id": row.get("staff_id"),
        "staff_name": staff_name,
        "archived": row.get("archived"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "antecedent": row.get("antecedent"),
        "presentation": row.get("presentation"),
        "staff_response": row.get("staff_response"),
        "trauma_informed_formulation": row.get("trauma_informed_formulation"),
        "child_voice": row.get("child_voice"),
        "restorative_follow_up": row.get("restorative_follow_up"),
        "manager_review_comment": row.get("manager_review_comment"),
        "approved_by": row.get("approved_by"),
        "approved_at": row.get("approved_at"),
        "returned_at": row.get("returned_at"),
        "submitted_at": row.get("submitted_at"),
        "physical_intervention_used": row.get("physical_intervention_used"),
        "physical_intervention_type": row.get("physical_intervention_type"),
        "physical_intervention_duration_minutes": row.get("physical_intervention_duration_minutes"),
        "physical_intervention_reason": row.get("physical_intervention_reason"),
        "body_map_required": row.get("body_map_required"),
        "body_map_json": row.get("body_map_json"),
        "external_notification_required": row.get("external_notification_required"),
        "external_notification_details": row.get("external_notification_details"),
        "requires_manager_review": True,
        "quality_standards": ["protection_of_children"],
        "judgement_areas": ["helped_and_protected"],
        "version_no": 1,
    }


def fetch_incident_by_id(cur, incident_id: int):
    cols = available_optional_columns(cur)
    extra_select = build_extra_select(cols)

    cur.execute(
        fetch_incident_select_sql(extra_select, "WHERE i.id = %s LIMIT 1"),
        (incident_id,),
    )
    row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")

    return row, cols


# =========================================================
# Models
# =========================================================

class IncidentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    young_person_id: int
    incident_datetime: Optional[str] = None
    occurred_at: Optional[str] = Field(default=None, alias="occurred_at")
    incident_type: str = "other"
    severity: Optional[str] = "medium"
    risk_level: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    narrative: Optional[str] = None
    manager_review_status: Optional[str] = "draft"
    workflow_status: Optional[str] = None
    follow_up_required: Optional[str] = None
    outcome: Optional[str] = None
    staff_id: Optional[int] = None
    archived: Optional[bool] = False

    antecedent: Optional[str] = None
    presentation: Optional[str] = None
    staff_response: Optional[str] = None
    trauma_informed_formulation: Optional[str] = None
    child_voice: Optional[str] = None
    restorative_follow_up: Optional[str] = None
    manager_review_comment: Optional[str] = None

    physical_intervention_used: Optional[bool] = False
    physical_intervention_type: Optional[str] = None
    physical_intervention_duration_minutes: Optional[int] = None
    physical_intervention_reason: Optional[str] = None

    body_map_required: Optional[bool] = False
    body_map_json: Optional[dict] = None

    external_notification_required: Optional[bool] = False
    external_notification_details: Optional[str] = None


class IncidentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    incident_datetime: Optional[str] = None
    occurred_at: Optional[str] = Field(default=None, alias="occurred_at")
    incident_type: Optional[str] = None
    severity: Optional[str] = None
    risk_level: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    narrative: Optional[str] = None
    manager_review_status: Optional[str] = None
    workflow_status: Optional[str] = None
    follow_up_required: Optional[str] = None
    outcome: Optional[str] = None
    staff_id: Optional[int] = None
    archived: Optional[bool] = None

    antecedent: Optional[str] = None
    presentation: Optional[str] = None
    staff_response: Optional[str] = None
    trauma_informed_formulation: Optional[str] = None
    child_voice: Optional[str] = None
    restorative_follow_up: Optional[str] = None
    manager_review_comment: Optional[str] = None

    physical_intervention_used: Optional[bool] = None
    physical_intervention_type: Optional[str] = None
    physical_intervention_duration_minutes: Optional[int] = None
    physical_intervention_reason: Optional[str] = None

    body_map_required: Optional[bool] = None
    body_map_json: Optional[dict] = None

    external_notification_required: Optional[bool] = None
    external_notification_details: Optional[str] = None


class IncidentReviewPayload(BaseModel):
    review_note: Optional[str] = None
    approved_by: Optional[int] = None


# =========================================================
# Read
# =========================================================

@router.get("/{young_person_id}/incidents")
def get_young_person_incidents(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cols = available_optional_columns(cur)
            extra_select = build_extra_select(cols)

            cur.execute(
                fetch_incident_select_sql(
                    extra_select,
                    """
                    WHERE i.young_person_id = %s
                    AND COALESCE(i.archived, FALSE) = FALSE
                    AND LOWER(COALESCE(i.manager_review_status, 'draft')) NOT IN ('archived', 'closed')
                    ORDER BY COALESCE(i.incident_datetime, i.created_at) DESC, i.id DESC
                    """,
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
            cols = available_optional_columns(cur)
            extra_select = build_extra_select(cols)

            cur.execute(
                fetch_incident_select_sql(
                    extra_select,
                    """
                    WHERE i.young_person_id = %s
                    AND (
                        COALESCE(i.archived, FALSE) = TRUE
                        OR LOWER(COALESCE(i.manager_review_status, '')) IN ('archived', 'closed', 'reviewed', 'approved')
                    )
                    ORDER BY COALESCE(i.incident_datetime, i.created_at) DESC, i.id DESC
                    """,
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
            row, _ = fetch_incident_by_id(cur, incident_id)
            return transform_incident_row(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load incident: {str(e)}")


# =========================================================
# Create / Update
# =========================================================

@router.post("/incidents")
def create_incident(payload: IncidentCreate, conn=Depends(get_db)):
    import json

    now = now_utc()
    incident_datetime = payload.incident_datetime or payload.occurred_at or now.isoformat()
    description = payload.description or payload.narrative
    severity = normalise_severity(payload.severity or payload.risk_level)
    follow_up_required = payload.follow_up_required or payload.outcome or payload.restorative_follow_up

    review_status = normalise_review_status(payload.manager_review_status or payload.workflow_status)
    if review_status == "submitted":
        review_status = "pending"
    if review_status == "approved":
        review_status = "reviewed"

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)
            cols = available_optional_columns(cur)

            insert_columns = [
                "young_person_id",
                "incident_datetime",
                "incident_type",
                "severity",
                "location",
                "description",
                "manager_review_status",
                "follow_up_required",
                "staff_id",
                "archived",
                "created_at",
                "updated_at",
            ]

            values = [
                payload.young_person_id,
                incident_datetime,
                payload.incident_type if payload.incident_type in INCIDENT_TYPE_OPTIONS else "other",
                severity,
                payload.location,
                description,
                review_status,
                follow_up_required,
                payload.staff_id,
                bool(payload.archived),
                now,
                now,
            ]

            optional_map = {
                "antecedent": payload.antecedent,
                "presentation": payload.presentation,
                "staff_response": payload.staff_response,
                "trauma_informed_formulation": payload.trauma_informed_formulation,
                "child_voice": payload.child_voice,
                "restorative_follow_up": payload.restorative_follow_up,
                "outcome": payload.outcome,
                "manager_review_comment": payload.manager_review_comment,
                "physical_intervention_used": payload.physical_intervention_used,
                "physical_intervention_type": payload.physical_intervention_type,
                "physical_intervention_duration_minutes": payload.physical_intervention_duration_minutes,
                "physical_intervention_reason": payload.physical_intervention_reason,
                "body_map_required": payload.body_map_required,
                "body_map_json": json.dumps(payload.body_map_json) if payload.body_map_json is not None else None,
                "external_notification_required": payload.external_notification_required,
                "external_notification_details": payload.external_notification_details,
            }

            for col, value in optional_map.items():
                if cols.get(col):
                    insert_columns.append(col)
                    values.append(value)

            placeholders = ", ".join(["%s"] * len(insert_columns))

            cur.execute(
                f"""
                INSERT INTO incidents ({", ".join(insert_columns)})
                VALUES ({placeholders})
                RETURNING id
                """,
                values,
            )
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
    import json

    update_data = payload.model_dump(exclude_unset=True, by_alias=False)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if "occurred_at" in update_data:
        update_data["incident_datetime"] = update_data.pop("occurred_at")

    if "narrative" in update_data:
        update_data["description"] = update_data.pop("narrative")

    if "risk_level" in update_data:
        update_data["severity"] = update_data.pop("risk_level")

    if "workflow_status" in update_data:
        workflow_status = normalise_review_status(update_data.pop("workflow_status"))
        if workflow_status == "submitted":
            update_data["manager_review_status"] = "pending"
        elif workflow_status == "approved":
            update_data["manager_review_status"] = "reviewed"
        else:
            update_data["manager_review_status"] = workflow_status

    if "severity" in update_data and update_data["severity"] is not None:
        update_data["severity"] = normalise_severity(update_data["severity"])

    if "manager_review_status" in update_data and update_data["manager_review_status"] is not None:
        update_data["manager_review_status"] = normalise_review_status(update_data["manager_review_status"])

    if "incident_type" in update_data and update_data["incident_type"] not in INCIDENT_TYPE_OPTIONS:
        update_data["incident_type"] = "other"

    if "body_map_json" in update_data and update_data["body_map_json"] is not None:
        update_data["body_map_json"] = json.dumps(update_data["body_map_json"])

    try:
        with conn.cursor() as cur:
            _, cols = fetch_incident_by_id(cur, incident_id)

            unsupported_optional = [
                "antecedent",
                "presentation",
                "staff_response",
                "trauma_informed_formulation",
                "child_voice",
                "restorative_follow_up",
                "outcome",
                "manager_review_comment",
                "approved_by",
                "approved_at",
                "returned_at",
                "submitted_at",
                "physical_intervention_used",
                "physical_intervention_type",
                "physical_intervention_duration_minutes",
                "physical_intervention_reason",
                "body_map_required",
                "body_map_json",
                "external_notification_required",
                "external_notification_details",
            ]

            for field in unsupported_optional:
                if not cols.get(field):
                    update_data.pop(field, None)

            update_data["updated_at"] = now_utc()

            set_parts = []
            values = []

            for field, value in update_data.items():
                set_parts.append(f"{field} = %s")
                values.append(value)

            values.append(incident_id)

            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
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
# Workflow
# =========================================================

@router.post("/incidents/{incident_id}/submit")
def submit_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            _, cols = fetch_incident_by_id(cur, incident_id)

            set_parts = ["manager_review_status = %s", "updated_at = %s"]
            values = ["pending", now_utc()]

            if cols.get("submitted_at"):
                set_parts.append("submitted_at = %s")
                values.append(now_utc())

            values.append(incident_id)

            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
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
def approve_incident(incident_id: int, payload: IncidentReviewPayload, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            _, cols = fetch_incident_by_id(cur, incident_id)

            set_parts = ["manager_review_status = %s", "updated_at = %s"]
            values = ["reviewed", now_utc()]

            if cols.get("manager_review_comment"):
                set_parts.append("manager_review_comment = %s")
                values.append(payload.review_note)

            if cols.get("approved_by"):
                set_parts.append("approved_by = %s")
                values.append(payload.approved_by)

            if cols.get("approved_at"):
                set_parts.append("approved_at = %s")
                values.append(now_utc())

            values.append(incident_id)

            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
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
def return_incident(incident_id: int, payload: IncidentReviewPayload, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            _, cols = fetch_incident_by_id(cur, incident_id)

            set_parts = ["manager_review_status = %s", "updated_at = %s"]
            values = ["returned", now_utc()]

            if cols.get("manager_review_comment"):
                set_parts.append("manager_review_comment = %s")
                values.append(payload.review_note)

            if cols.get("returned_at"):
                set_parts.append("returned_at = %s")
                values.append(now_utc())

            values.append(incident_id)

            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

            conn.commit()
            return {"ok": True, "status": "returned", "id": row["id"]}
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
                SET archived = TRUE,
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
# Export
# =========================================================

@router.get("/incidents/{incident_id}/export")
def export_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row, _ = fetch_incident_by_id(cur, incident_id)
            incident = transform_incident_row(row)

            text = f"""INDICARE INCIDENT EXPORT

Incident ID: {incident.get('id') or '—'}
Young person ID: {incident.get('young_person_id') or '—'}

Incident type: {incident.get('incident_type') or '—'}
Occurred at: {incident.get('occurred_at') or '—'}
Severity: {incident.get('severity') or '—'}
Location: {incident.get('location') or '—'}

Description
{incident.get('description') or '—'}

Antecedent
{incident.get('antecedent') or '—'}

Presentation
{incident.get('presentation') or '—'}

Staff response
{incident.get('staff_response') or '—'}

Trauma-informed formulation
{incident.get('trauma_informed_formulation') or '—'}

Child voice
{incident.get('child_voice') or '—'}

Outcome / Follow-up
{incident.get('outcome') or incident.get('follow_up_required') or '—'}

Physical intervention used: {incident.get('physical_intervention_used')}
Physical intervention type: {incident.get('physical_intervention_type') or '—'}
Physical intervention duration: {incident.get('physical_intervention_duration_minutes') or '—'}
Physical intervention reason: {incident.get('physical_intervention_reason') or '—'}

Body map required: {incident.get('body_map_required')}
Body map data: {incident.get('body_map_json') or '—'}

External notification required: {incident.get('external_notification_required')}
External notification details: {incident.get('external_notification_details') or '—'}

Manager review status: {incident.get('manager_review_status') or '—'}
Workflow status: {incident.get('workflow_status') or '—'}
Manager review comment: {incident.get('manager_review_comment') or '—'}

Recorded by: {incident.get('staff_name') or '—'}
Created at: {incident.get('created_at') or '—'}
Updated at: {incident.get('updated_at') or '—'}
"""

            return PlainTextResponse(
                content=text,
                headers={"Content-Disposition": f'inline; filename="incident-{incident_id}.txt"'},
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export incident: {str(e)}")
