from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Chronology"])


# =========================================================
# Models
# =========================================================

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

    # richer optional fields
    event_status: str | None = "recorded"
    linked_standard: str | None = None
    linked_judgement_area: str | None = None
    linked_document_id: int | None = None
    linked_review_id: int | None = None
    linked_action_id: int | None = None
    tags_json: dict | None = None


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

    event_status: str | None = None
    linked_standard: str | None = None
    linked_judgement_area: str | None = None
    linked_document_id: int | None = None
    linked_review_id: int | None = None
    linked_action_id: int | None = None
    tags_json: dict | None = None


# =========================================================
# Helpers
# =========================================================

def now_utc():
    return datetime.utcnow()


def full_name(first_name, last_name):
    return " ".join([x for x in [first_name, last_name] if x]).strip() or None


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def try_execute(cur, query: str, params=()):
    try:
        cur.execute(query, params)
        return True
    except Exception:
        return False


def chronology_select_sql(where_sql: str):
    return f"""
        SELECT
            ce.*,
            u.first_name AS created_by_first_name,
            u.last_name AS created_by_last_name
        FROM chronology_events ce
        LEFT JOIN users u
            ON ce.created_by = u.id
        {where_sql}
    """


def transform_row(row: dict) -> dict:
    created_by_name = full_name(
        row.get("created_by_first_name"),
        row.get("created_by_last_name"),
    )

    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "event_datetime": row.get("event_datetime"),
        "occurred_at": row.get("event_datetime"),
        "category": row.get("category"),
        "subcategory": row.get("subcategory"),
        "title": row.get("title"),
        "summary": row.get("summary"),
        "significance": row.get("significance") or "standard",
        "source_table": row.get("source_table"),
        "source_id": row.get("source_id"),
        "created_by": row.get("created_by"),
        "created_by_name": created_by_name,
        "auto_generated": row.get("auto_generated"),
        "is_visible": row.get("is_visible"),
        "metadata_json": row.get("metadata_json"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),

        # richer fields
        "event_status": row.get("event_status") or "recorded",
        "linked_standard": row.get("linked_standard"),
        "linked_judgement_area": row.get("linked_judgement_area"),
        "linked_document_id": row.get("linked_document_id"),
        "linked_review_id": row.get("linked_review_id"),
        "linked_action_id": row.get("linked_action_id"),
        "tags_json": row.get("tags_json"),
    }


def insert_auto_event(
    cur,
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
    metadata_json=None,
    linked_standard=None,
    linked_judgement_area=None,
):
    cur.execute(
        """
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
            linked_standard,
            linked_judgement_area,
            event_status,
            created_at,
            updated_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            TRUE, TRUE, %s::jsonb, %s, %s, %s, %s, %s
        )
        """,
        (
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
            json.dumps(metadata_json) if metadata_json is not None else None,
            linked_standard,
            linked_judgement_area,
            "recorded",
            now_utc(),
            now_utc(),
        ),
    )


# =========================================================
# Read routes
# =========================================================

@router.get("/{young_person_id}/chronology")
def list_chronology_events(
    young_person_id: int,
    category: str | None = Query(default=None),
    significance: str | None = Query(default=None),
    source_table: str | None = Query(default=None),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            where_parts = [
                "WHERE ce.young_person_id = %s",
                "AND COALESCE(ce.is_visible, TRUE) = TRUE",
            ]
            values = [young_person_id]

            if category:
                where_parts.append("AND ce.category = %s")
                values.append(category)

            if significance:
                where_parts.append("AND ce.significance = %s")
                values.append(significance)

            if source_table:
                where_parts.append("AND ce.source_table = %s")
                values.append(source_table)

            where_parts.append("ORDER BY ce.event_datetime DESC, ce.id DESC")

            query = chronology_select_sql("\n".join(where_parts))
            cur.execute(query, tuple(values))
            rows = cur.fetchall() or []

        return {"items": [transform_row(r) for r in rows]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load chronology: {str(e)}")


@router.get("/chronology/{event_id}")
def get_chronology_event(event_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                chronology_select_sql("WHERE ce.id = %s LIMIT 1"),
                (event_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Chronology event not found")

        return transform_row(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load chronology event: {str(e)}")


# =========================================================
# Create / update routes
# =========================================================

@router.post("/chronology")
def create_chronology_event(payload: ChronologyEventCreate, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)

            cur.execute(
                """
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
                    event_status,
                    linked_standard,
                    linked_judgement_area,
                    linked_document_id,
                    linked_review_id,
                    linked_action_id,
                    tags_json,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s
                )
                RETURNING id
                """,
                (
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
                    payload.event_status or "recorded",
                    payload.linked_standard,
                    payload.linked_judgement_area,
                    payload.linked_document_id,
                    payload.linked_review_id,
                    payload.linked_action_id,
                    json.dumps(payload.tags_json) if payload.tags_json is not None else None,
                    now_utc(),
                    now_utc(),
                ),
            )
            new_row = cur.fetchone()

        conn.commit()
        return {"message": "Chronology event created successfully", "id": new_row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create chronology event: {str(e)}")


@router.put("/chronology/{event_id}")
def update_chronology_event(event_id: int, payload: ChronologyEventUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    set_parts = []
    values = []

    for field, value in update_data.items():
        if field in {"metadata_json", "tags_json"}:
            set_parts.append(f"{field} = %s::jsonb")
            values.append(json.dumps(value) if value is not None else None)
        else:
            set_parts.append(f"{field} = %s")
            values.append(value)

    set_parts.append("updated_at = %s")
    values.append(now_utc())
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

        if not updated_row:
            raise HTTPException(status_code=404, detail="Chronology event not found")

        return {"message": "Chronology event updated successfully", "id": updated_row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update chronology event: {str(e)}")


# =========================================================
# Rebuild route
# =========================================================

@router.post("/{young_person_id}/chronology/rebuild")
def rebuild_chronology(young_person_id: int, conn=Depends(get_db)):
    counts = {
        "daily_notes": 0,
        "incidents": 0,
        "health_records": 0,
        "education_records": 0,
        "family_contact_records": 0,
        "keywork_sessions": 0,
        "support_plans": 0,
        "risk_assessments": 0,
    }

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)

            cur.execute(
                """
                DELETE FROM chronology_events
                WHERE young_person_id = %s
                  AND COALESCE(auto_generated, FALSE) = TRUE
                """,
                (young_person_id,),
            )

            # Daily notes
            if try_execute(
                cur,
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'daily_notes'
                LIMIT 1
                """
            ):
                cur.execute(
                    """
                    SELECT
                        dn.id,
                        dn.young_person_id,
                        COALESCE(dn.note_date::timestamp, dn.created_at) AS event_datetime,
                        dn.shift_type,
                        COALESCE(dn.positives, dn.presentation, dn.behaviour_update, 'Daily note entry') AS summary,
                        COALESCE(dn.significance, 'standard') AS significance,
                        dn.author_id
                    FROM daily_notes dn
                    WHERE dn.young_person_id = %s
                    """,
                    (young_person_id,),
                )
                for row in cur.fetchall() or []:
                    insert_auto_event(
                        cur=cur,
                        young_person_id=row["young_person_id"],
                        event_datetime=row["event_datetime"],
                        category="daily_note",
                        subcategory=row.get("shift_type"),
                        title="Daily note recorded",
                        summary=row.get("summary"),
                        significance=row.get("significance") or "standard",
                        source_table="daily_notes",
                        source_id=row["id"],
                        created_by=row.get("author_id"),
                        metadata_json={"source": "daily_notes"},
                        linked_judgement_area="experiences_and_progress",
                    )
                    counts["daily_notes"] += 1

            # Incidents
            cur.execute(
                """
                SELECT
                    i.id,
                    i.young_person_id,
                    COALESCE(i.incident_datetime, i.created_at) AS event_datetime,
                    i.incident_type,
                    i.description,
                    COALESCE(i.severity, 'standard') AS significance,
                    i.staff_id,
                    i.manager_review_status,
                    i.location
                FROM incidents i
                WHERE i.young_person_id = %s
                  AND COALESCE(i.archived, FALSE) = FALSE
                """,
                (young_person_id,),
            )
            for row in cur.fetchall() or []:
                insert_auto_event(
                    cur=cur,
                    young_person_id=row["young_person_id"],
                    event_datetime=row["event_datetime"],
                    category="incident",
                    subcategory=row.get("incident_type"),
                    title=(row.get("incident_type") or "Incident recorded").replace("_", " ").title(),
                    summary=row.get("description"),
                    significance=row.get("significance") or "standard",
                    source_table="incidents",
                    source_id=row["id"],
                    created_by=row.get("staff_id"),
                    metadata_json={
                        "source": "incidents",
                        "manager_review_status": row.get("manager_review_status"),
                        "location": row.get("location"),
                    },
                    linked_standard="protection_of_children",
                    linked_judgement_area="helped_and_protected",
                )
                counts["incidents"] += 1

            # Health records
            if try_execute(
                cur,
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'health_records'
                LIMIT 1
                """
            ):
                cur.execute(
                    """
                    SELECT
                        hr.id,
                        hr.young_person_id,
                        hr.event_datetime,
                        hr.record_type,
                        hr.title,
                        hr.summary,
                        CASE WHEN hr.follow_up_required THEN 'high' ELSE 'standard' END AS significance,
                        hr.created_by,
                        hr.follow_up_required
                    FROM health_records hr
                    WHERE hr.young_person_id = %s
                    """,
                    (young_person_id,),
                )
                for row in cur.fetchall() or []:
                    insert_auto_event(
                        cur=cur,
                        young_person_id=row["young_person_id"],
                        event_datetime=row["event_datetime"],
                        category="health",
                        subcategory=row.get("record_type"),
                        title=row.get("title") or "Health record",
                        summary=row.get("summary"),
                        significance=row.get("significance") or "standard",
                        source_table="health_records",
                        source_id=row["id"],
                        created_by=row.get("created_by"),
                        metadata_json={
                            "source": "health_records",
                            "follow_up_required": row.get("follow_up_required"),
                        },
                        linked_standard="health_and_wellbeing",
                        linked_judgement_area="experiences_and_progress",
                    )
                    counts["health_records"] += 1

            # Education records
            if try_execute(
                cur,
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'education_records'
                LIMIT 1
                """
            ):
                cur.execute(
                    """
                    SELECT
                        er.id,
                        er.young_person_id,
                        COALESCE(er.record_date::timestamp, er.created_at) AS event_datetime,
                        er.attendance_status,
                        COALESCE(er.provision_name, 'Education record') AS title,
                        COALESCE(er.achievement_note, er.behaviour_summary, er.learning_engagement, 'Education update') AS summary,
                        er.created_by
                    FROM education_records er
                    WHERE er.young_person_id = %s
                    """,
                    (young_person_id,),
                )
                for row in cur.fetchall() or []:
                    insert_auto_event(
                        cur=cur,
                        young_person_id=row["young_person_id"],
                        event_datetime=row["event_datetime"],
                        category="education",
                        subcategory=row.get("attendance_status"),
                        title=row.get("title"),
                        summary=row.get("summary"),
                        significance="standard",
                        source_table="education_records",
                        source_id=row["id"],
                        created_by=row.get("created_by"),
                        metadata_json={"source": "education_records"},
                        linked_standard="education",
                        linked_judgement_area="experiences_and_progress",
                    )
                    counts["education_records"] += 1

            # Family records
            if try_execute(
                cur,
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'family_contact_records'
                LIMIT 1
                """
            ):
                cur.execute(
                    """
                    SELECT
                        fcr.id,
                        fcr.young_person_id,
                        fcr.contact_datetime AS event_datetime,
                        fcr.contact_type,
                        COALESCE(fcr.contact_person, 'Family contact') AS title,
                        COALESCE(fcr.child_voice, fcr.post_contact_presentation, fcr.concerns, 'Family contact recorded') AS summary,
                        CASE WHEN fcr.follow_up_required THEN 'high' ELSE 'standard' END AS significance,
                        fcr.created_by,
                        fcr.follow_up_required
                    FROM family_contact_records fcr
                    WHERE fcr.young_person_id = %s
                    """,
                    (young_person_id,),
                )
                for row in cur.fetchall() or []:
                    insert_auto_event(
                        cur=cur,
                        young_person_id=row["young_person_id"],
                        event_datetime=row["event_datetime"],
                        category="family",
                        subcategory=row.get("contact_type"),
                        title=row.get("title"),
                        summary=row.get("summary"),
                        significance=row.get("significance") or "standard",
                        source_table="family_contact_records",
                        source_id=row["id"],
                        created_by=row.get("created_by"),
                        metadata_json={
                            "source": "family_contact_records",
                            "follow_up_required": row.get("follow_up_required"),
                        },
                        linked_standard="positive_relationships",
                        linked_judgement_area="experiences_and_progress",
                    )
                    counts["family_contact_records"] += 1

            # Keywork sessions
            if try_execute(
                cur,
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'keywork_sessions'
                LIMIT 1
                """
            ):
                cur.execute(
                    """
                    SELECT
                        ks.id,
                        ks.young_person_id,
                        COALESCE(ks.session_date::timestamp, ks.created_at) AS event_datetime,
                        ks.topic,
                        COALESCE(ks.summary, ks.child_voice, ks.reflective_analysis, 'Key work session recorded') AS summary,
                        ks.worker_id
                    FROM keywork_sessions ks
                    WHERE ks.young_person_id = %s
                    """,
                    (young_person_id,),
                )
                for row in cur.fetchall() or []:
                    insert_auto_event(
                        cur=cur,
                        young_person_id=row["young_person_id"],
                        event_datetime=row["event_datetime"],
                        category="keywork",
                        subcategory=row.get("topic"),
                        title=row.get("topic") or "Key work session",
                        summary=row.get("summary"),
                        significance="standard",
                        source_table="keywork_sessions",
                        source_id=row["id"],
                        created_by=row.get("worker_id"),
                        metadata_json={"source": "keywork_sessions"},
                        linked_standard="positive_relationships",
                        linked_judgement_area="experiences_and_progress",
                    )
                    counts["keywork_sessions"] += 1

            # Support plans
            cur.execute(
                """
                SELECT
                    sp.id,
                    sp.young_person_id,
                    sp.created_at AS event_datetime,
                    sp.plan_type,
                    sp.title,
                    COALESCE(sp.summary, sp.presenting_need, 'Support plan recorded') AS summary,
                    sp.created_by,
                    sp.approval_status,
                    sp.status
                FROM support_plans sp
                WHERE sp.young_person_id = %s
                  AND COALESCE(sp.archived, FALSE) = FALSE
                """,
                (young_person_id,),
            )
            for row in cur.fetchall() or []:
                insert_auto_event(
                    cur=cur,
                    young_person_id=row["young_person_id"],
                    event_datetime=row["event_datetime"],
                    category="plan",
                    subcategory=row.get("plan_type"),
                    title=row.get("title") or "Support plan",
                    summary=row.get("summary"),
                    significance="standard",
                    source_table="support_plans",
                    source_id=row["id"],
                    created_by=row.get("created_by"),
                    metadata_json={
                        "source": "support_plans",
                        "approval_status": row.get("approval_status"),
                        "status": row.get("status"),
                    },
                    linked_standard="care_planning",
                    linked_judgement_area="leadership_and_management",
                )
                counts["support_plans"] += 1

            # Risk assessments
            if try_execute(
                cur,
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'risk_assessments'
                LIMIT 1
                """
            ):
                cur.execute(
                    """
                    SELECT
                        ra.id,
                        ra.young_person_id,
                        ra.created_at AS event_datetime,
                        ra.category,
                        ra.title,
                        COALESCE(ra.concern_summary, 'Risk assessment recorded') AS summary,
                        COALESCE(ra.severity, 'standard') AS significance,
                        ra.created_by
                    FROM risk_assessments ra
                    WHERE ra.young_person_id = %s
                      AND COALESCE(ra.archived, FALSE) = FALSE
                    """,
                    (young_person_id,),
                )
                for row in cur.fetchall() or []:
                    insert_auto_event(
                        cur=cur,
                        young_person_id=row["young_person_id"],
                        event_datetime=row["event_datetime"],
                        category="risk",
                        subcategory=row.get("category"),
                        title=row.get("title") or "Risk assessment",
                        summary=row.get("summary"),
                        significance=row.get("significance") or "standard",
                        source_table="risk_assessments",
                        source_id=row["id"],
                        created_by=row.get("created_by"),
                        metadata_json={"source": "risk_assessments"},
                        linked_standard="protection_of_children",
                        linked_judgement_area="helped_and_protected",
                    )
                    counts["risk_assessments"] += 1

        conn.commit()
        return {
            "message": "Chronology rebuilt successfully",
            "counts": counts,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to rebuild chronology: {str(e)}")
