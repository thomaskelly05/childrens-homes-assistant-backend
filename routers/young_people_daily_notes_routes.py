from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from db.connection import get_db
from services.young_people_linking_service import YoungPeopleLinkingService

router = APIRouter(prefix="/young-people", tags=["Young People Daily Notes"])


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


def normalise_workflow_status(value: Optional[str]) -> str:
    v = (value or "").strip().lower()
    if v in {"draft", "submitted", "approved", "returned", "reviewed", "completed", "archived"}:
        return v
    return "draft"


def workflow_display_status(value: Optional[str]) -> str:
    v = normalise_workflow_status(value)
    if v == "reviewed":
        return "approved"
    return v


def fetch_daily_note_select_sql(where_sql: str):
    return f"""
        SELECT
            dn.id,
            dn.young_person_id,
            dn.home_id,
            dn.note_date,
            dn.shift_type,
            dn.mood,
            dn.presentation,
            dn.activities,
            dn.education_update,
            dn.health_update,
            dn.family_update,
            dn.behaviour_update,
            dn.young_person_voice,
            dn.positives,
            dn.actions_required,
            dn.significance,
            dn.workflow_status,
            dn.manager_review_comment,
            dn.approved_by,
            dn.approved_at,
            dn.returned_at,
            dn.submitted_at,
            dn.last_edited_at,
            dn.author_id,
            dn.created_at,
            dn.updated_at,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name,
            a.first_name AS approved_by_first_name,
            a.last_name AS approved_by_last_name
        FROM daily_notes dn
        LEFT JOIN users u ON dn.author_id = u.id
        LEFT JOIN users a ON dn.approved_by = a.id
        {where_sql}
    """


def transform_daily_note_row(row: dict) -> dict:
    author_name = full_name(row.get("author_first_name"), row.get("author_last_name"))
    approved_by_name = full_name(row.get("approved_by_first_name"), row.get("approved_by_last_name"))
    workflow_status = workflow_display_status(row.get("workflow_status"))

    summary_parts = [
        row.get("positives"),
        row.get("presentation"),
        row.get("behaviour_update"),
        row.get("actions_required"),
    ]
    summary = " | ".join([str(x).strip() for x in summary_parts if x and str(x).strip()])

    return {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "home_id": row.get("home_id"),
        "note_date": row.get("note_date"),
        "recorded_at": row.get("note_date"),
        "shift_type": row.get("shift_type"),
        "mood": row.get("mood"),
        "presentation": row.get("presentation"),
        "activities": row.get("activities"),
        "education_update": row.get("education_update"),
        "health_update": row.get("health_update"),
        "family_update": row.get("family_update"),
        "behaviour_update": row.get("behaviour_update"),
        "young_person_voice": row.get("young_person_voice"),
        "child_voice": row.get("young_person_voice"),
        "positives": row.get("positives"),
        "actions_required": row.get("actions_required"),
        "significance": row.get("significance") or "standard",
        "workflow_status": workflow_status,
        "manager_review_comment": row.get("manager_review_comment"),
        "approved_by": row.get("approved_by"),
        "approved_by_name": approved_by_name,
        "approved_at": row.get("approved_at"),
        "returned_at": row.get("returned_at"),
        "submitted_at": row.get("submitted_at"),
        "last_edited_at": row.get("last_edited_at"),
        "author_id": row.get("author_id"),
        "author_name": author_name,
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),

        # Shell-friendly aliases
        "title": f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note",
        "summary": summary or "Daily note recorded",
        "narrative": summary or "Daily note recorded",
        "event_type": "daily_note",
        "requires_manager_review": True,
        "quality_standards": ["quality_and_purpose_of_care"],
        "judgement_areas": ["experiences_and_progress"],
        "version_no": 1,
    }


def fetch_daily_note_by_id(cur, daily_note_id: int):
    cur.execute(
        fetch_daily_note_select_sql("WHERE dn.id = %s LIMIT 1"),
        (daily_note_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Daily note not found")
    return row


def build_daily_note_summary(
    *,
    presentation: Optional[str],
    activities: Optional[str],
    education_update: Optional[str],
    health_update: Optional[str],
    family_update: Optional[str],
    behaviour_update: Optional[str],
    actions_required: Optional[str],
    positives: Optional[str],
) -> str:
    parts = [
        positives,
        presentation,
        activities,
        education_update,
        health_update,
        family_update,
        behaviour_update,
        actions_required,
    ]
    text = " | ".join([str(x).strip() for x in parts if x and str(x).strip()])
    return text or "Daily note recorded"


def build_daily_note_narrative(
    *,
    mood: Optional[str],
    presentation: Optional[str],
    activities: Optional[str],
    education_update: Optional[str],
    health_update: Optional[str],
    family_update: Optional[str],
    behaviour_update: Optional[str],
    young_person_voice: Optional[str],
    positives: Optional[str],
    actions_required: Optional[str],
) -> str:
    parts = [
        f"Mood: {mood}" if mood else None,
        f"Presentation: {presentation}" if presentation else None,
        f"Activities: {activities}" if activities else None,
        f"Education: {education_update}" if education_update else None,
        f"Health: {health_update}" if health_update else None,
        f"Family: {family_update}" if family_update else None,
        f"Behaviour: {behaviour_update}" if behaviour_update else None,
        f"Young person voice: {young_person_voice}" if young_person_voice else None,
        f"Positives: {positives}" if positives else None,
        f"Actions required: {actions_required}" if actions_required else None,
    ]
    return "\n".join([p for p in parts if p]) or "Daily note recorded"


def build_daily_note_title(shift_type: Optional[str], note_date: Optional[str]) -> str:
    shift = (shift_type or "shift").replace("_", " ").title()
    date_part = note_date or "undated"
    return f"{shift} daily note - {date_part}"


# =========================================================
# Models
# =========================================================

class DailyNoteCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    young_person_id: int
    home_id: int | None = None
    note_date: str
    shift_type: str

    mood: str | None = None
    presentation: str | None = None
    activities: str | None = None
    education_update: str | None = None
    health_update: str | None = None
    family_update: str | None = None
    behaviour_update: str | None = None
    young_person_voice: str | None = None
    positives: str | None = None
    actions_required: str | None = None
    significance: str | None = None

    workflow_status: str | None = "draft"
    manager_review_comment: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None
    returned_at: str | None = None
    submitted_at: str | None = None
    last_edited_at: str | None = None
    author_id: int | None = None

    # UI aliases
    child_voice: str | None = Field(default=None, alias="child_voice")
    recorded_at: str | None = Field(default=None, alias="recorded_at")
    narrative: str | None = Field(default=None, alias="narrative")
    title: str | None = None

    # OS workflow flags
    create_follow_up_task: bool = False
    link_to_chronology: bool = True
    link_to_support_plans: bool = False
    manager_review_needed: bool = False
    safeguarding_concern: bool = False
    link_monthly_reviews: bool = False
    link_quality_standards: bool = True


class DailyNoteUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    home_id: int | None = None
    note_date: str | None = None
    shift_type: str | None = None

    mood: str | None = None
    presentation: str | None = None
    activities: str | None = None
    education_update: str | None = None
    health_update: str | None = None
    family_update: str | None = None
    behaviour_update: str | None = None
    young_person_voice: str | None = None
    positives: str | None = None
    actions_required: str | None = None
    significance: str | None = None

    workflow_status: str | None = None
    manager_review_comment: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None
    returned_at: str | None = None
    submitted_at: str | None = None
    last_edited_at: str | None = None
    author_id: int | None = None

    # UI aliases
    child_voice: str | None = Field(default=None, alias="child_voice")
    recorded_at: str | None = Field(default=None, alias="recorded_at")
    narrative: str | None = Field(default=None, alias="narrative")
    title: str | None = None


class ReviewDecisionPayload(BaseModel):
    review_note: str | None = None
    approved_by: int | None = None


# =========================================================
# Read routes
# =========================================================

@router.get("/{young_person_id}/daily-notes")
def get_young_person_daily_notes(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_daily_note_select_sql(
                    """
                    WHERE dn.young_person_id = %s
                      AND LOWER(COALESCE(dn.workflow_status, 'draft')) NOT IN ('completed', 'archived')
                    ORDER BY dn.note_date DESC, dn.created_at DESC, dn.id DESC
                    """
                ),
                (young_person_id,),
            )
            rows = cur.fetchall() or []
            return {"items": [transform_daily_note_row(r) for r in rows]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load daily notes: {str(e)}")


@router.get("/{young_person_id}/daily-notes/archive")
def get_young_person_archived_daily_notes(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, young_person_id)
            cur.execute(
                fetch_daily_note_select_sql(
                    """
                    WHERE dn.young_person_id = %s
                      AND LOWER(COALESCE(dn.workflow_status, '')) IN ('completed', 'archived')
                    ORDER BY dn.note_date DESC, dn.created_at DESC, dn.id DESC
                    """
                ),
                (young_person_id,),
            )
            rows = cur.fetchall() or []
            return {"items": [transform_daily_note_row(r) for r in rows]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived daily notes: {str(e)}")


@router.get("/daily-notes/{daily_note_id}")
def get_daily_note(daily_note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_daily_note_by_id(cur, daily_note_id)
            return transform_daily_note_row(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load daily note: {str(e)}")


# =========================================================
# Create / update routes
# =========================================================

@router.post("/daily-notes")
def create_daily_note(payload: DailyNoteCreate, conn=Depends(get_db)):
    now = now_utc()

    note_date = payload.note_date or payload.recorded_at
    if not note_date:
        raise HTTPException(status_code=400, detail="note_date is required")

    young_person_voice = payload.young_person_voice if payload.young_person_voice is not None else payload.child_voice

    query = """
        INSERT INTO daily_notes (
            young_person_id,
            home_id,
            note_date,
            shift_type,
            mood,
            presentation,
            activities,
            education_update,
            health_update,
            family_update,
            behaviour_update,
            young_person_voice,
            positives,
            actions_required,
            significance,
            workflow_status,
            manager_review_comment,
            approved_by,
            approved_at,
            returned_at,
            submitted_at,
            last_edited_at,
            author_id,
            created_at,
            updated_at
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.home_id,
        note_date,
        payload.shift_type,
        payload.mood,
        payload.presentation,
        payload.activities,
        payload.education_update,
        payload.health_update,
        payload.family_update,
        payload.behaviour_update,
        young_person_voice,
        payload.positives,
        payload.actions_required,
        payload.significance,
        normalise_workflow_status(payload.workflow_status),
        payload.manager_review_comment,
        payload.approved_by,
        payload.approved_at,
        payload.returned_at,
        payload.submitted_at,
        payload.last_edited_at or now,
        payload.author_id,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            ensure_young_person_exists(cur, payload.young_person_id)
            cur.execute(query, values)
            row = cur.fetchone()
            daily_note_id = row["id"]

            workflow_result = YoungPeopleLinkingService.process_record_event(
                conn=conn,
                young_person_id=payload.young_person_id,
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="created",
                title=payload.title or build_daily_note_title(payload.shift_type, note_date),
                summary=build_daily_note_summary(
                    presentation=payload.presentation,
                    activities=payload.activities,
                    education_update=payload.education_update,
                    health_update=payload.health_update,
                    family_update=payload.family_update,
                    behaviour_update=payload.behaviour_update,
                    actions_required=payload.actions_required,
                    positives=payload.positives,
                ),
                narrative=payload.narrative or build_daily_note_narrative(
                    mood=payload.mood,
                    presentation=payload.presentation,
                    activities=payload.activities,
                    education_update=payload.education_update,
                    health_update=payload.health_update,
                    family_update=payload.family_update,
                    behaviour_update=payload.behaviour_update,
                    young_person_voice=young_person_voice,
                    positives=payload.positives,
                    actions_required=payload.actions_required,
                ),
                category="daily_note",
                subcategory=payload.shift_type or "daily_note",
                significance=payload.significance or "medium",
                due_date=note_date,
                owner_id=payload.author_id,
                created_by=payload.author_id,
                workflow={
                    "link_chronology": payload.link_to_chronology,
                    "create_task": payload.create_follow_up_task or bool(payload.actions_required),
                    "manager_review": payload.manager_review_needed or normalise_workflow_status(payload.workflow_status) in {"submitted", "approved"},
                    "safeguarding": payload.safeguarding_concern,
                    "link_support_plans": payload.link_to_support_plans,
                    "link_monthly_reviews": payload.link_monthly_reviews,
                    "link_quality_standards": payload.link_quality_standards,
                },
                metadata={
                    "severity": payload.significance or "medium",
                    "workflow_status": normalise_workflow_status(payload.workflow_status),
                    "shift_type": payload.shift_type,
                    "note_date": note_date,
                    "quality_standards": ["quality_and_purpose_of_care"] if payload.link_quality_standards else [],
                    "standards_rationale": "Linked from daily note workflow",
                    "evidence_strength": "medium",
                    "response_actions": payload.actions_required,
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        return {
            "message": "Daily note created successfully",
            "id": daily_note_id,
            "workflow": workflow_result,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create daily note: {str(e)}")


@router.put("/daily-notes/{daily_note_id}")
def update_daily_note(daily_note_id: int, payload: DailyNoteUpdate, conn=Depends(get_db)):
    update_data = payload.model_dump(exclude_unset=True, by_alias=False)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if "child_voice" in update_data:
        update_data["young_person_voice"] = update_data.pop("child_voice")

    if "recorded_at" in update_data:
        update_data["note_date"] = update_data.pop("recorded_at")

    update_data.pop("title", None)
    update_data.pop("narrative", None)

    if "workflow_status" in update_data and update_data["workflow_status"] is not None:
        update_data["workflow_status"] = normalise_workflow_status(update_data["workflow_status"])

    update_data["updated_at"] = now_utc()
    update_data["last_edited_at"] = now_utc()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(daily_note_id)

    query = f"""
        UPDATE daily_notes
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
            raise HTTPException(status_code=404, detail="Daily note not found")

        conn.commit()
        return {"message": "Daily note updated successfully", "id": row["id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update daily note: {str(e)}")


# =========================================================
# Workflow routes
# =========================================================

@router.post("/daily-notes/{daily_note_id}/submit")
def submit_daily_note(daily_note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_daily_note_by_id(cur, daily_note_id)

            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    submitted_at = %s,
                    updated_at = %s,
                    last_edited_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("submitted", now_utc(), now_utc(), now_utc(), daily_note_id),
            )
            updated = cur.fetchone()

            workflow_result = YoungPeopleLinkingService.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="submitted",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note submitted",
                summary=transform_daily_note_row(row)["summary"],
                narrative=transform_daily_note_row(row)["narrative"],
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "medium",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=row.get("author_id"),
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": row.get("significance") or "medium",
                    "workflow_status": "submitted",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                    "quality_standards": ["quality_and_purpose_of_care"],
                    "standards_rationale": "Daily note submitted for workflow review",
                    "evidence_strength": "medium",
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        return {"ok": True, "status": "submitted", "id": updated["id"], "workflow": workflow_result}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit daily note: {str(e)}")


@router.post("/daily-notes/{daily_note_id}/approve")
def approve_daily_note(daily_note_id: int, payload: ReviewDecisionPayload, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_daily_note_by_id(cur, daily_note_id)

            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    manager_review_comment = %s,
                    approved_by = %s,
                    approved_at = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                (
                    "approved",
                    payload.review_note,
                    payload.approved_by,
                    now_utc(),
                    now_utc(),
                    daily_note_id,
                ),
            )
            updated = cur.fetchone()

            workflow_result = YoungPeopleLinkingService.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="approved",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note approved",
                summary=transform_daily_note_row(row)["summary"],
                narrative=payload.review_note or transform_daily_note_row(row)["narrative"],
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "medium",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=payload.approved_by,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": row.get("significance") or "medium",
                    "workflow_status": "approved",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                    "quality_standards": ["quality_and_purpose_of_care"],
                    "standards_rationale": "Daily note approved",
                    "evidence_strength": "strong",
                    "judgement_areas": ["experiences_and_progress"],
                    "manager_review_comment": payload.review_note,
                },
            )

        conn.commit()
        return {"ok": True, "status": "approved", "id": updated["id"], "workflow": workflow_result}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve daily note: {str(e)}")


@router.post("/daily-notes/{daily_note_id}/return")
def return_daily_note(daily_note_id: int, payload: ReviewDecisionPayload, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_daily_note_by_id(cur, daily_note_id)

            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    manager_review_comment = %s,
                    returned_at = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                (
                    "returned",
                    payload.review_note,
                    now_utc(),
                    now_utc(),
                    daily_note_id,
                ),
            )
            updated = cur.fetchone()

            workflow_result = YoungPeopleLinkingService.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="returned",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note returned",
                summary=transform_daily_note_row(row)["summary"],
                narrative=payload.review_note or "Daily note returned for revision",
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "medium",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=payload.approved_by,
                workflow={
                    "link_chronology": True,
                    "create_task": True,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": row.get("significance") or "medium",
                    "workflow_status": "returned",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                    "response_actions": payload.review_note,
                    "manager_review_comment": payload.review_note,
                },
            )

        conn.commit()
        return {
            "ok": True,
            "status": "returned",
            "id": updated["id"],
            "review_note": payload.review_note or "",
            "workflow": workflow_result,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return daily note: {str(e)}")


@router.post("/daily-notes/{daily_note_id}/archive")
def archive_daily_note(daily_note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            row = fetch_daily_note_by_id(cur, daily_note_id)

            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", now_utc(), daily_note_id),
            )
            updated = cur.fetchone()

            workflow_result = YoungPeopleLinkingService.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="daily_notes",
                source_id=daily_note_id,
                event_type="archived",
                title=f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note archived",
                summary=transform_daily_note_row(row)["summary"],
                narrative="Daily note archived",
                category="daily_note",
                subcategory=row.get("shift_type") or "daily_note",
                significance=row.get("significance") or "low",
                due_date=row.get("note_date"),
                owner_id=row.get("author_id"),
                created_by=row.get("author_id"),
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": row.get("significance") or "low",
                    "workflow_status": "archived",
                    "shift_type": row.get("shift_type"),
                    "note_date": str(row.get("note_date")) if row.get("note_date") else None,
                },
            )

        conn.commit()
        return {"ok": True, "status": "archived", "id": updated["id"], "workflow": workflow_result}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive daily note: {str(e)}")
