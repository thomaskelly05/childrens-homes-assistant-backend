from __future__ import annotations

import json
import re
from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Daily Notes"])


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

VALID_WORKFLOW_STATUSES = {"draft", "completed", "reviewed", "amended", "returned"}
VALID_SHIFT_TYPES = {"day", "evening", "night", "waking_night", "school", "custom"}

THERAPEUTIC_LANGUAGE_RULES = [
    {
        "pattern": r"\battention seeking\b",
        "suggestion": "seeking reassurance or connection",
        "reason": "This is more therapeutic and clearer about possible unmet need."
    },
    {
        "pattern": r"\bmanipulative\b",
        "suggestion": "trying to manage the situation in a way that may reflect anxiety or unmet need",
        "reason": "This avoids judgemental language and supports reflective thinking."
    },
    {
        "pattern": r"\brefused\b",
        "suggestion": "was not able to engage / declined at this time",
        "reason": "This helps describe the situation without sounding punitive."
    },
    {
        "pattern": r"\bchallenging behaviour\b",
        "suggestion": "distress-related behaviour / behaviour indicating dysregulation",
        "reason": "This reflects the emotional meaning behind behaviour."
    },
    {
        "pattern": r"\bnon compliant\b",
        "suggestion": "found it difficult to engage with the request",
        "reason": "This is more child-centred and less judgemental."
    },
    {
        "pattern": r"\baggressive\b",
        "suggestion": "appeared very distressed and presented with aggressive behaviour",
        "reason": "This keeps the factual element while recognising distress."
    },
]


def ensure_young_person_exists(conn, young_person_id: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")


def fetch_user_name(cur, user_id: Optional[int]) -> Optional[str]:
    if not user_id:
        return None

    cur.execute(
        """
        SELECT first_name, last_name
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        return None

    first_name = row.get("first_name") if isinstance(row, dict) else row[0]
    last_name = row.get("last_name") if isinstance(row, dict) else row[1]
    return " ".join(part for part in [first_name, last_name] if part).strip() or None


def parse_csv_text(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def build_therapeutic_language_suggestions(texts: List[str]) -> List[Dict[str, str]]:
    joined = "\n".join([text for text in texts if text]).strip()
    if not joined:
        return []

    suggestions = []
    lowered = joined.lower()

    for rule in THERAPEUTIC_LANGUAGE_RULES:
        if re.search(rule["pattern"], lowered, flags=re.IGNORECASE):
            suggestions.append(
                {
                    "matched_pattern": rule["pattern"],
                    "suggestion": rule["suggestion"],
                    "reason": rule["reason"],
                }
            )

    return suggestions


def normalise_content_for_storage(payload: "DailyNoteUpsert") -> Dict[str, Any]:
    return {
        "basic_context": {
            "note_date": payload.note_date.isoformat(),
            "shift_type": payload.shift_type,
            "custom_shift_label": payload.custom_shift_label,
            "staff_on_shift": payload.staff_on_shift,
            "location": payload.location,
            "tags": payload.tags,
            "significant_event": payload.significant_event,
            "manager_review_required": payload.manager_review_required,
        },
        "what_happened": {
            "presentation": payload.presentation,
            "main_events": payload.main_events,
            "routine_engagement": payload.routine_engagement,
            "education_update": payload.education_update,
            "health_update": payload.health_update,
            "family_update": payload.family_update,
            "worries": payload.worries,
            "positives": payload.positives,
        },
        "pace": {
            "playfulness": {
                "status": payload.pace_playfulness_status,
                "reflection": payload.pace_playfulness,
            },
            "acceptance": {
                "status": payload.pace_acceptance_status,
                "reflection": payload.pace_acceptance,
            },
            "curiosity": {
                "tags": parse_csv_text(payload.pace_curiosity_tags),
                "reflection": payload.pace_curiosity,
            },
            "empathy": {
                "tags": parse_csv_text(payload.pace_empathy_tags),
                "reflection": payload.pace_empathy,
            },
        },
        "young_person_voice": {
            "voice": payload.young_person_voice,
            "communication_style": payload.communication_style,
        },
        "staff_response": {
            "staff_response": payload.staff_response,
            "what_helped": payload.what_helped,
            "what_did_not_help": payload.what_did_not_help,
            "impact": payload.impact,
        },
        "follow_up": {
            "actions_required": payload.actions_required,
            "discuss_in_handover": payload.discuss_in_handover,
            "update_risk_assessment": payload.update_risk_assessment,
            "link_monthly_review": payload.link_monthly_review,
        },
        "evidence": {
            "linked_standards": parse_csv_text(payload.linked_standards),
            "linked_risks": parse_csv_text(payload.linked_risks),
            "linked_plans": parse_csv_text(payload.linked_plans),
            "impact_statement": payload.evidence_impact_statement,
        },
        "review_meta": {
            "change_reason": payload.change_reason,
            "manager_review_comment": payload.manager_review_comment,
        },
    }


def row_to_note_summary(row: Dict[str, Any]) -> Dict[str, Any]:
    content = row.get("content_json") or {}
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except Exception:
            content = {}

    return {
        "id": row["id"],
        "young_person_id": row["young_person_id"],
        "home_id": row["home_id"],
        "note_date": row["note_date"].isoformat() if row.get("note_date") else None,
        "shift_type": row.get("shift_type"),
        "workflow_status": row.get("workflow_status"),
        "version_number": row.get("version_number"),
        "author_id": row.get("author_id"),
        "author_name": row.get("author_name"),
        "approved_by": row.get("approved_by"),
        "approved_by_name": row.get("approved_by_name"),
        "manager_review_required": row.get("manager_review_required"),
        "significant_event": row.get("significant_event"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
        "last_edited_at": row["last_edited_at"].isoformat() if row.get("last_edited_at") else None,
        "submitted_at": row["submitted_at"].isoformat() if row.get("submitted_at") else None,
        "approved_at": row["approved_at"].isoformat() if row.get("approved_at") else None,
        "returned_at": row["returned_at"].isoformat() if row.get("returned_at") else None,
        "summary": {
            "presentation": (
                content.get("what_happened", {}).get("presentation")
                if isinstance(content, dict)
                else None
            ),
            "positives": (
                content.get("what_happened", {}).get("positives")
                if isinstance(content, dict)
                else None
            ),
            "young_person_voice": (
                content.get("young_person_voice", {}).get("voice")
                if isinstance(content, dict)
                else None
            ),
            "actions_required": (
                content.get("follow_up", {}).get("actions_required")
                if isinstance(content, dict)
                else None
            ),
        },
        "content_json": content,
    }


# -------------------------------------------------------------------
# Pydantic models
# -------------------------------------------------------------------

class DailyNoteUpsert(BaseModel):
    home_id: Optional[int] = None
    note_date: date
    shift_type: str
    custom_shift_label: Optional[str] = None
    staff_on_shift: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[str] = None
    significant_event: bool = False
    manager_review_required: bool = False

    presentation: Optional[str] = None
    main_events: Optional[str] = None
    routine_engagement: Optional[str] = None
    education_update: Optional[str] = None
    health_update: Optional[str] = None
    family_update: Optional[str] = None
    worries: Optional[str] = None
    positives: Optional[str] = None

    pace_playfulness_status: Optional[str] = "not_used"
    pace_playfulness: Optional[str] = None
    pace_acceptance_status: Optional[str] = "not_evident"
    pace_acceptance: Optional[str] = None
    pace_curiosity_tags: Optional[str] = None
    pace_curiosity: Optional[str] = None
    pace_empathy_tags: Optional[str] = None
    pace_empathy: Optional[str] = None

    young_person_voice: Optional[str] = None
    communication_style: Optional[str] = None

    staff_response: Optional[str] = None
    what_helped: Optional[str] = None
    what_did_not_help: Optional[str] = None
    impact: Optional[str] = None

    actions_required: Optional[str] = None
    discuss_in_handover: bool = False
    update_risk_assessment: bool = False
    link_monthly_review: bool = False

    linked_standards: Optional[str] = None
    linked_risks: Optional[str] = None
    linked_plans: Optional[str] = None
    evidence_impact_statement: Optional[str] = None

    change_reason: Optional[str] = None
    manager_review_comment: Optional[str] = None
    author_id: Optional[int] = None

    @validator("shift_type")
    def validate_shift_type(cls, value: str) -> str:
        if value not in VALID_SHIFT_TYPES:
            raise ValueError(f"shift_type must be one of {sorted(VALID_SHIFT_TYPES)}")
        return value


class DailyNoteCreateRequest(DailyNoteUpsert):
    save_as: Literal["draft", "completed"] = "draft"


class DailyNoteUpdateRequest(DailyNoteUpsert):
    edited_by: Optional[int] = None
    save_as: Literal["draft", "completed", "amended"] = "draft"


class ReviewRequest(BaseModel):
    reviewed_by: int
    manager_review_comment: Optional[str] = None
    mark_as: Literal["reviewed", "returned"] = "reviewed"


class TherapeuticLanguageRequest(BaseModel):
    text_fields: List[str] = Field(default_factory=list)


# -------------------------------------------------------------------
# SQL bootstrap note
# -------------------------------------------------------------------
# This router expects:
#
# 1) daily_notes.content_json JSONB
# 2) daily_notes.version_number INT DEFAULT 1
# 3) daily_notes.change_reason TEXT NULL
# 4) daily_notes.reviewed_by INT NULL
# 5) daily_notes.manager_review_required BOOLEAN DEFAULT FALSE
# 6) daily_notes.significant_event BOOLEAN DEFAULT FALSE
# 7) daily_notes_versions table
#
# Recommended daily_notes_versions table:
#
# CREATE TABLE IF NOT EXISTS daily_notes_versions (
#   id SERIAL PRIMARY KEY,
#   daily_note_id INT NOT NULL REFERENCES daily_notes(id) ON DELETE CASCADE,
#   version_number INT NOT NULL,
#   content_json JSONB NOT NULL,
#   workflow_status VARCHAR(30) NOT NULL,
#   change_reason TEXT,
#   edited_by INT NULL REFERENCES users(id),
#   edited_at TIMESTAMP NOT NULL DEFAULT NOW(),
#   manager_review_comment TEXT,
#   UNIQUE (daily_note_id, version_number)
# );
#

# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------

@router.get("/{young_person_id}/daily-notes")
def get_young_person_daily_notes(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    dn.id,
                    dn.young_person_id,
                    dn.home_id,
                    dn.note_date,
                    dn.shift_type,
                    dn.workflow_status,
                    dn.version_number,
                    dn.author_id,
                    dn.approved_by,
                    dn.manager_review_required,
                    dn.significant_event,
                    dn.created_at,
                    dn.updated_at,
                    dn.last_edited_at,
                    dn.submitted_at,
                    dn.approved_at,
                    dn.returned_at,
                    dn.content_json,
                    CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS author_name,
                    CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS approved_by_name
                FROM daily_notes dn
                LEFT JOIN users u
                    ON dn.author_id = u.id
                LEFT JOIN users a
                    ON dn.approved_by = a.id
                WHERE dn.young_person_id = %s
                ORDER BY dn.note_date DESC, dn.updated_at DESC, dn.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall()

        return [row_to_note_summary(row) for row in rows]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load daily notes: {str(e)}"
        )


@router.get("/{young_person_id}/daily-notes/{daily_note_id}")
def get_single_daily_note(
    young_person_id: int,
    daily_note_id: int,
    conn=Depends(get_db),
):
    try:
        ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    dn.id,
                    dn.young_person_id,
                    dn.home_id,
                    dn.note_date,
                    dn.shift_type,
                    dn.workflow_status,
                    dn.version_number,
                    dn.author_id,
                    dn.approved_by,
                    dn.manager_review_required,
                    dn.significant_event,
                    dn.created_at,
                    dn.updated_at,
                    dn.last_edited_at,
                    dn.submitted_at,
                    dn.approved_at,
                    dn.returned_at,
                    dn.content_json,
                    dn.change_reason,
                    dn.manager_review_comment,
                    CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS author_name,
                    CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS approved_by_name
                FROM daily_notes dn
                LEFT JOIN users u
                    ON dn.author_id = u.id
                LEFT JOIN users a
                    ON dn.approved_by = a.id
                WHERE dn.id = %s
                  AND dn.young_person_id = %s
                LIMIT 1
                """,
                (daily_note_id, young_person_id),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Daily note not found")

        return row_to_note_summary(row)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load daily note: {str(e)}"
        )


@router.post("/{young_person_id}/daily-notes")
def create_daily_note(
    young_person_id: int,
    payload: DailyNoteCreateRequest,
    conn=Depends(get_db),
):
    try:
        ensure_young_person_exists(conn, young_person_id)

        workflow_status = "draft" if payload.save_as == "draft" else "completed"
        content_json = normalise_content_for_storage(payload)

        therapeutic_language_suggestions = build_therapeutic_language_suggestions(
            [
                payload.presentation or "",
                payload.main_events or "",
                payload.routine_engagement or "",
                payload.education_update or "",
                payload.health_update or "",
                payload.family_update or "",
                payload.worries or "",
                payload.positives or "",
                payload.pace_playfulness or "",
                payload.pace_acceptance or "",
                payload.pace_curiosity or "",
                payload.pace_empathy or "",
                payload.young_person_voice or "",
                payload.communication_style or "",
                payload.staff_response or "",
                payload.what_helped or "",
                payload.what_did_not_help or "",
                payload.impact or "",
                payload.actions_required or "",
                payload.evidence_impact_statement or "",
            ]
        )

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_notes (
                    young_person_id,
                    home_id,
                    note_date,
                    shift_type,
                    workflow_status,
                    content_json,
                    version_number,
                    author_id,
                    manager_review_required,
                    significant_event,
                    submitted_at,
                    last_edited_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s::jsonb, 1, %s, %s, %s,
                    CASE WHEN %s = 'completed' THEN NOW() ELSE NULL END,
                    NOW(),
                    NOW(),
                    NOW()
                )
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.home_id,
                    payload.note_date,
                    payload.shift_type,
                    workflow_status,
                    json.dumps(content_json),
                    payload.author_id,
                    payload.manager_review_required,
                    payload.significant_event,
                    workflow_status,
                ),
            )
            inserted = cur.fetchone()
            daily_note_id = inserted["id"] if isinstance(inserted, dict) else inserted[0]

            cur.execute(
                """
                INSERT INTO daily_notes_versions (
                    daily_note_id,
                    version_number,
                    content_json,
                    workflow_status,
                    change_reason,
                    edited_by,
                    edited_at,
                    manager_review_comment
                )
                VALUES (%s, 1, %s::jsonb, %s, %s, %s, NOW(), %s)
                """,
                (
                    daily_note_id,
                    json.dumps(content_json),
                    workflow_status,
                    payload.change_reason,
                    payload.author_id,
                    payload.manager_review_comment,
                ),
            )

        conn.commit()

        return {
            "message": "Daily note created successfully",
            "daily_note_id": daily_note_id,
            "workflow_status": workflow_status,
            "version_number": 1,
            "therapeutic_language_suggestions": therapeutic_language_suggestions,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create daily note: {str(e)}"
        )


@router.put("/{young_person_id}/daily-notes/{daily_note_id}")
def update_daily_note(
    young_person_id: int,
    daily_note_id: int,
    payload: DailyNoteUpdateRequest,
    conn=Depends(get_db),
):
    try:
        ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    workflow_status,
                    version_number,
                    author_id
                FROM daily_notes
                WHERE id = %s
                  AND young_person_id = %s
                LIMIT 1
                """,
                (daily_note_id, young_person_id),
            )
            existing = cur.fetchone()

            if not existing:
                raise HTTPException(status_code=404, detail="Daily note not found")

            current_status = existing["workflow_status"] if isinstance(existing, dict) else existing[1]
            current_version = existing["version_number"] if isinstance(existing, dict) else existing[2]

            if current_status == "reviewed" and not payload.change_reason:
                raise HTTPException(
                    status_code=400,
                    detail="A reviewed note requires a change_reason before amendment"
                )

            new_status = payload.save_as
            if current_status == "reviewed" and payload.save_as in {"draft", "completed"}:
                new_status = "amended"
            elif payload.save_as == "completed":
                new_status = "completed"
            elif payload.save_as == "draft":
                new_status = "draft"

            new_version = current_version + 1
            content_json = normalise_content_for_storage(payload)

            therapeutic_language_suggestions = build_therapeutic_language_suggestions(
                [
                    payload.presentation or "",
                    payload.main_events or "",
                    payload.routine_engagement or "",
                    payload.education_update or "",
                    payload.health_update or "",
                    payload.family_update or "",
                    payload.worries or "",
                    payload.positives or "",
                    payload.pace_playfulness or "",
                    payload.pace_acceptance or "",
                    payload.pace_curiosity or "",
                    payload.pace_empathy or "",
                    payload.young_person_voice or "",
                    payload.communication_style or "",
                    payload.staff_response or "",
                    payload.what_helped or "",
                    payload.what_did_not_help or "",
                    payload.impact or "",
                    payload.actions_required or "",
                    payload.evidence_impact_statement or "",
                ]
            )

            cur.execute(
                """
                UPDATE daily_notes
                SET
                    home_id = %s,
                    note_date = %s,
                    shift_type = %s,
                    workflow_status = %s,
                    content_json = %s::jsonb,
                    version_number = %s,
                    manager_review_required = %s,
                    significant_event = %s,
                    submitted_at = CASE
                        WHEN %s IN ('completed', 'amended') THEN NOW()
                        ELSE submitted_at
                    END,
                    last_edited_at = NOW(),
                    updated_at = NOW(),
                    change_reason = %s,
                    manager_review_comment = %s
                WHERE id = %s
                """,
                (
                    payload.home_id,
                    payload.note_date,
                    payload.shift_type,
                    new_status,
                    json.dumps(content_json),
                    new_version,
                    payload.manager_review_required,
                    payload.significant_event,
                    new_status,
                    payload.change_reason,
                    payload.manager_review_comment,
                    daily_note_id,
                ),
            )

            cur.execute(
                """
                INSERT INTO daily_notes_versions (
                    daily_note_id,
                    version_number,
                    content_json,
                    workflow_status,
                    change_reason,
                    edited_by,
                    edited_at,
                    manager_review_comment
                )
                VALUES (%s, %s, %s::jsonb, %s, %s, %s, NOW(), %s)
                """,
                (
                    daily_note_id,
                    new_version,
                    json.dumps(content_json),
                    new_status,
                    payload.change_reason,
                    payload.edited_by or payload.author_id,
                    payload.manager_review_comment,
                ),
            )

        conn.commit()

        return {
            "message": "Daily note updated successfully",
            "daily_note_id": daily_note_id,
            "workflow_status": new_status,
            "version_number": new_version,
            "therapeutic_language_suggestions": therapeutic_language_suggestions,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update daily note: {str(e)}"
        )


@router.post("/{young_person_id}/daily-notes/{daily_note_id}/review")
def review_daily_note(
    young_person_id: int,
    daily_note_id: int,
    payload: ReviewRequest,
    conn=Depends(get_db),
):
    try:
        ensure_young_person_exists(conn, young_person_id)

        if payload.mark_as not in {"reviewed", "returned"}:
            raise HTTPException(status_code=400, detail="Invalid review action")

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    version_number,
                    content_json,
                    workflow_status
                FROM daily_notes
                WHERE id = %s
                  AND young_person_id = %s
                LIMIT 1
                """,
                (daily_note_id, young_person_id),
            )
            existing = cur.fetchone()

            if not existing:
                raise HTTPException(status_code=404, detail="Daily note not found")

            current_version = existing["version_number"] if isinstance(existing, dict) else existing[1]
            content_json = existing["content_json"] if isinstance(existing, dict) else existing[2]
            new_status = payload.mark_as

            cur.execute(
                """
                UPDATE daily_notes
                SET
                    workflow_status = %s,
                    approved_by = %s,
                    approved_at = CASE WHEN %s = 'reviewed' THEN NOW() ELSE approved_at END,
                    returned_at = CASE WHEN %s = 'returned' THEN NOW() ELSE returned_at END,
                    manager_review_comment = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (
                    new_status,
                    payload.reviewed_by,
                    new_status,
                    new_status,
                    payload.manager_review_comment,
                    daily_note_id,
                ),
            )

            cur.execute(
                """
                INSERT INTO daily_notes_versions (
                    daily_note_id,
                    version_number,
                    content_json,
                    workflow_status,
                    change_reason,
                    edited_by,
                    edited_at,
                    manager_review_comment
                )
                VALUES (%s, %s, %s::jsonb, %s, %s, %s, NOW(), %s)
                """,
                (
                    daily_note_id,
                    current_version,
                    json.dumps(content_json if isinstance(content_json, dict) else json.loads(content_json)),
                    new_status,
                    "manager_review",
                    payload.reviewed_by,
                    payload.manager_review_comment,
                ),
            )

        conn.commit()

        return {
            "message": f"Daily note marked as {new_status}",
            "daily_note_id": daily_note_id,
            "workflow_status": new_status,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to review daily note: {str(e)}"
        )


@router.get("/{young_person_id}/daily-notes/{daily_note_id}/versions")
def get_daily_note_versions(
    young_person_id: int,
    daily_note_id: int,
    conn=Depends(get_db),
):
    try:
        ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM daily_notes
                WHERE id = %s
                  AND young_person_id = %s
                LIMIT 1
                """,
                (daily_note_id, young_person_id),
            )
            note_row = cur.fetchone()

            if not note_row:
                raise HTTPException(status_code=404, detail="Daily note not found")

            cur.execute(
                """
                SELECT
                    dnv.id,
                    dnv.daily_note_id,
                    dnv.version_number,
                    dnv.content_json,
                    dnv.workflow_status,
                    dnv.change_reason,
                    dnv.edited_by,
                    dnv.edited_at,
                    dnv.manager_review_comment,
                    CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS edited_by_name
                FROM daily_notes_versions dnv
                LEFT JOIN users u
                    ON dnv.edited_by = u.id
                WHERE dnv.daily_note_id = %s
                ORDER BY dnv.version_number DESC, dnv.edited_at DESC
                """,
                (daily_note_id,),
            )
            versions = cur.fetchall()

        response = []
        for row in versions:
            content = row.get("content_json") if isinstance(row, dict) else row[3]
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except Exception:
                    content = {}

            response.append(
                {
                    "id": row["id"] if isinstance(row, dict) else row[0],
                    "daily_note_id": row["daily_note_id"] if isinstance(row, dict) else row[1],
                    "version_number": row["version_number"] if isinstance(row, dict) else row[2],
                    "content_json": content,
                    "workflow_status": row["workflow_status"] if isinstance(row, dict) else row[4],
                    "change_reason": row["change_reason"] if isinstance(row, dict) else row[5],
                    "edited_by": row["edited_by"] if isinstance(row, dict) else row[6],
                    "edited_at": (
                        row["edited_at"].isoformat() if isinstance(row, dict) and row.get("edited_at")
                        else (row[7].isoformat() if row[7] else None)
                    ),
                    "manager_review_comment": row["manager_review_comment"] if isinstance(row, dict) else row[8],
                    "edited_by_name": row["edited_by_name"] if isinstance(row, dict) else row[9],
                }
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load daily note history: {str(e)}"
        )


@router.post("/daily-notes/therapeutic-language-check")
def therapeutic_language_check(payload: TherapeuticLanguageRequest):
    try:
        suggestions = build_therapeutic_language_suggestions(payload.text_fields)
        return {
            "suggestions": suggestions,
            "count": len(suggestions),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyse therapeutic language: {str(e)}"
        )
