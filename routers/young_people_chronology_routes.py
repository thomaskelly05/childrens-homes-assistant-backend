from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Chronology"])


class ChronologyEventCreate(BaseModel):
    young_person_id: int
    event_datetime: str
    category: str
    subcategory: str | None = None
    title: str
    summary: str | None = None
    significance: str = "standard"
    source_table: str | None = None
    source_id: int | None = None
    created_by: int | None = None
    auto_generated: bool = False
    is_visible: bool = True
    metadata_json: dict | None = None


class ChronologyEventUpdate(BaseModel):
    event_datetime: str | None = None
    category: str | None = None
    subcategory: str | None = None
    title: str | None = None
    summary: str | None = None
    significance: str | None = None
    source_table: str | None = None
    source_id: int | None = None
    created_by: int | None = None
    auto_generated: bool | None = None
    is_visible: bool | None = None
    metadata_json: dict | None = None


@router.get("/{young_person_id}/chronology")
def list_chronology_events(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            ce.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM chronology_events ce
        LEFT JOIN users u ON ce.created_by = u.id
        WHERE ce.young_person_id = %s
          AND COALESCE(ce.is_visible, TRUE) = TRUE
        ORDER BY ce.event_datetime DESC, ce.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/chronology/{event_id}")
def get_chronology_event(
    event_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            ce.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM chronology_events ce
        LEFT JOIN users u ON ce.created_by = u.id
        WHERE ce.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (event_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Chronology event not found")

    return row


@router.post("/chronology")
def create_chronology_event(
    payload: ChronologyEventCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO chronology_events (
            young_person_id,
            event_datetime,
            category,
            subcategory,
            title,
            summary,
            significance,
            source_table,
            source_id,
            created_by,
            auto_generated,
            is_visible,
            metadata_json,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
        RETURNING id
    """

    import json

    values = (
        payload.young_person_id,
        payload.event_datetime,
        payload.category,
        payload.subcategory,
        payload.title,
        payload.summary,
        payload.significance,
        payload.source_table,
        payload.source_id,
        payload.created_by,
        payload.auto_generated,
        payload.is_visible,
        json.dumps(payload.metadata_json) if payload.metadata_json is not None else None,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            new_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create chronology event: {str(e)}")

    return {"message": "Chronology event created successfully", "id": new_row["id"]}


@router.put("/chronology/{event_id}")
def update_chronology_event(
    event_id: int,
    payload: ChronologyEventUpdate,
    conn=Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    import json

    set_parts = []
    values = []

    for field, value in update_data.items():
        if field == "metadata_json":
            set_parts.append("metadata_json = %s::jsonb")
            values.append(json.dumps(value) if value is not None else None)
        else:
            set_parts.append(f"{field} = %s")
            values.append(value)

    values.append(event_id)

    query = f"""
        UPDATE chronology_events
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
        raise HTTPException(status_code=500, detail=f"Failed to update chronology event: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Chronology event not found")

    return {"message": "Chronology event updated successfully", "id": updated_row["id"]}


@router.post("/{young_person_id}/chronology/rebuild")
def rebuild_chronology(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            # remove only auto-generated events
            cur.execute(
                """
                DELETE FROM chronology_events
                WHERE young_person_id = %s
                  AND COALESCE(auto_generated, FALSE) = TRUE
                """,
                (young_person_id,),
            )

            # daily notes
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    dn.young_person_id,
                    dn.created_at,
                    'daily_note',
                    dn.shift_type,
                    'Daily note recorded',
                    COALESCE(dn.positives, dn.presentation, dn.behaviour_update, 'Daily note entry'),
                    COALESCE(dn.significance, 'standard'),
                    'daily_notes',
                    dn.id,
                    dn.author_id,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM daily_notes dn
                WHERE dn.young_person_id = %s
                """,
                (young_person_id,),
            )

            # incidents
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    i.young_person_id,
                    COALESCE(i.incident_datetime, i.created_at),
                    'incident',
                    i.incident_type,
                    COALESCE(i.incident_type, 'Incident recorded'),
                    i.description,
                    COALESCE(i.severity, 'standard'),
                    'incidents',
                    i.id,
                    i.staff_id,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM incidents i
                WHERE i.young_person_id = %s
                """,
                (young_person_id,),
            )

            # health records
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    hr.young_person_id,
                    hr.event_datetime,
                    'health',
                    hr.record_type,
                    hr.title,
                    hr.summary,
                    CASE WHEN hr.follow_up_required THEN 'high' ELSE 'standard' END,
                    'health_records',
                    hr.id,
                    hr.created_by,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM health_records hr
                WHERE hr.young_person_id = %s
                """,
                (young_person_id,),
            )

            # education records
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    er.young_person_id,
                    er.created_at,
                    'education',
                    er.attendance_status,
                    COALESCE(er.provision_name, 'Education record'),
                    COALESCE(er.achievement_note, er.behaviour_summary, er.learning_engagement, 'Education update'),
                    'standard',
                    'education_records',
                    er.id,
                    er.created_by,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM education_records er
                WHERE er.young_person_id = %s
                """,
                (young_person_id,),
            )

            # family records
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    fcr.young_person_id,
                    fcr.contact_datetime,
                    'family',
                    fcr.contact_type,
                    COALESCE(fcr.contact_person, 'Family contact'),
                    COALESCE(fcr.child_voice, fcr.post_contact_presentation, fcr.concerns, 'Family contact recorded'),
                    CASE WHEN fcr.follow_up_required THEN 'high' ELSE 'standard' END,
                    'family_contact_records',
                    fcr.id,
                    fcr.created_by,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM family_contact_records fcr
                WHERE fcr.young_person_id = %s
                """,
                (young_person_id,),
            )

            # keywork sessions
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    ks.young_person_id,
                    ks.created_at,
                    'keywork',
                    ks.topic,
                    COALESCE(ks.topic, 'Key work session'),
                    COALESCE(ks.summary, ks.child_voice, ks.reflective_analysis, 'Key work session recorded'),
                    'standard',
                    'keywork_sessions',
                    ks.id,
                    ks.worker_id,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM keywork_sessions ks
                WHERE ks.young_person_id = %s
                """,
                (young_person_id,),
            )

            # support plans
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    sp.young_person_id,
                    sp.created_at,
                    'plan',
                    sp.plan_type,
                    sp.title,
                    COALESCE(sp.summary, sp.presenting_need, 'Support plan recorded'),
                    'standard',
                    'support_plans',
                    sp.id,
                    sp.created_by,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM support_plans sp
                WHERE sp.young_person_id = %s
                """,
                (young_person_id,),
            )

            # risk assessments
            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id, event_datetime, category, subcategory, title, summary,
                    significance, source_table, source_id, created_by, auto_generated, is_visible,
                    metadata_json, created_at
                )
                SELECT
                    ra.young_person_id,
                    ra.created_at,
                    'risk',
                    ra.category,
                    ra.title,
                    COALESCE(ra.concern_summary, 'Risk assessment recorded'),
                    COALESCE(ra.severity, 'standard'),
                    'risk_assessments',
                    ra.id,
                    ra.created_by,
                    TRUE,
                    TRUE,
                    NULL,
                    NOW()
                FROM risk_assessments ra
                WHERE ra.young_person_id = %s
                """,
                (young_person_id,),
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to rebuild chronology: {str(e)}")

    return {"message": "Chronology rebuilt successfully"}
