from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Daily Notes"])


# -------------------------------------------------------------------
# Pydantic models
# -------------------------------------------------------------------

class DailyNoteCreate(BaseModel):
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
    significance: str = "standard"
    author_id: int | None = None
    workflow_status: str = "draft"
    manager_review_comment: str | None = None
    approved_by: int | None = None


class DailyNoteUpdate(BaseModel):
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
    author_id: int | None = None
    workflow_status: str | None = None
    manager_review_comment: str | None = None
    approved_by: int | None = None


class ReturnDailyNotePayload(BaseModel):
    manager_review_comment: str | None = None


class LinkedDraftUpdate(BaseModel):
    form_data: dict[str, Any]


# -------------------------------------------------------------------
# Workflow helpers
# -------------------------------------------------------------------

def utcnow() -> datetime:
    return datetime.utcnow()


def apply_workflow_timestamps(update_data: dict, now: datetime) -> dict:
    workflow_status = update_data.get("workflow_status")

    if workflow_status == "submitted":
        update_data["submitted_at"] = now
    elif workflow_status == "approved":
        update_data["approved_at"] = now
    elif workflow_status == "returned":
        update_data["returned_at"] = now

    update_data["last_edited_at"] = now
    return update_data


def format_author_name(row: dict | None, first_key: str, last_key: str) -> str | None:
    if not row:
        return None
    first = row.get(first_key) or ""
    last = row.get(last_key) or ""
    full = f"{first} {last}".strip()
    return full or None


# -------------------------------------------------------------------
# Data fetch helpers
# -------------------------------------------------------------------

def get_daily_note_row(conn, daily_note_id: int) -> dict | None:
    query = """
        SELECT
            dn.*,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name,
            approver.first_name AS approved_by_first_name,
            approver.last_name AS approved_by_last_name
        FROM daily_notes dn
        LEFT JOIN users u ON dn.author_id = u.id
        LEFT JOIN users approver ON dn.approved_by = approver.id
        WHERE dn.id = %s
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (daily_note_id,))
        return cur.fetchone()


def get_latest_analysis_row(conn, daily_note_id: int) -> dict | None:
    query = """
        SELECT *
        FROM assistant_note_analysis
        WHERE daily_note_id = %s
        ORDER BY created_at DESC, id DESC
        LIMIT 1
    """
    with conn.cursor() as cur:
        cur.execute(query, (daily_note_id,))
        return cur.fetchone()


def get_suggestion_row(conn, suggestion_id: int, daily_note_id: int) -> dict | None:
    query = """
        SELECT *
        FROM assistant_suggested_actions
        WHERE id = %s AND daily_note_id = %s
        LIMIT 1
    """
    with conn.cursor() as cur:
        cur.execute(query, (suggestion_id, daily_note_id))
        return cur.fetchone()


def get_linked_draft_row(conn, draft_id: int) -> dict | None:
    query = """
        SELECT
            lrd.*,
            dn.note_date AS source_note_date
        FROM linked_record_drafts lrd
        LEFT JOIN daily_notes dn ON dn.id = lrd.daily_note_id
        WHERE lrd.id = %s
        LIMIT 1
    """
    with conn.cursor() as cur:
        cur.execute(query, (draft_id,))
        return cur.fetchone()


# -------------------------------------------------------------------
# Assistant analysis helpers
# Replace run_assistant_analysis() with your real assistant provider call
# when ready.
# -------------------------------------------------------------------

def split_sentences(text: str | None) -> list[str]:
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def text_contains_any(text: str, words: list[str]) -> bool:
    lower = text.lower()
    return any(word in lower for word in words)


def extract_quotes(text: str | None) -> list[str]:
    if not text:
        return []
    matches = re.findall(r'"([^"]+)"|“([^”]+)”|\'([^\']+)\'', text)
    results: list[str] = []
    for triple in matches:
        for item in triple:
            if item:
                results.append(item.strip())
    return results[:5]


def build_evidence_items(sentences: list[str], theme: str, limit: int = 3) -> list[dict[str, Any]]:
    items = []
    for sentence in sentences[:limit]:
        items.append({
            "quote": sentence if len(sentence) <= 280 else sentence[:277] + "...",
            "theme": theme,
            "detail": sentence if len(sentence) <= 500 else sentence[:497] + "...",
        })
    return items


def build_assistant_summary(extracted: dict[str, Any]) -> dict[str, int]:
    return {
        "child_voice": len(extracted.get("child_voice", [])),
        "risks": len(extracted.get("risks", [])),
        "strengths": len(extracted.get("strengths", [])),
        "therapeutic_strategies": len(extracted.get("therapeutic_strategies", [])),
        "education_issues": len(extracted.get("education_issues", [])),
        "health_issues": len(extracted.get("health_issues", [])),
        "family_themes": len(extracted.get("family_themes", [])),
        "safeguarding_indicators": len(extracted.get("safeguarding_indicators", [])),
        "behaviour_themes": len(extracted.get("behaviour_themes", [])),
        "actions_required": len(extracted.get("actions_required", [])),
    }


def compose_daily_note_for_analysis(note: dict) -> str:
    return "\n".join([
        f"Note date: {note.get('note_date', '')}",
        f"Shift type: {note.get('shift_type', '')}",
        f"Mood: {note.get('mood', '')}",
        f"Presentation: {note.get('presentation', '')}",
        f"Activities: {note.get('activities', '')}",
        f"Education update: {note.get('education_update', '')}",
        f"Health update: {note.get('health_update', '')}",
        f"Family update: {note.get('family_update', '')}",
        f"Behaviour update: {note.get('behaviour_update', '')}",
        f"Young person voice: {note.get('young_person_voice', '')}",
        f"Positives: {note.get('positives', '')}",
        f"Actions required: {note.get('actions_required', '')}",
        f"Significance: {note.get('significance', '')}",
    ])


def run_assistant_analysis(note: dict) -> dict[str, Any]:
    """
    This is a safe local fallback so the route works immediately.

    Replace this function with your real main assistant call when ready.
    The output shape is already what the frontend expects.
    """
    full_text = compose_daily_note_for_analysis(note)
    voice_text = note.get("young_person_voice") or ""
    education_text = note.get("education_update") or ""
    health_text = note.get("health_update") or ""
    family_text = note.get("family_update") or ""
    behaviour_text = note.get("behaviour_update") or ""
    presentation_text = note.get("presentation") or ""
    positives_text = note.get("positives") or ""
    actions_text = note.get("actions_required") or ""

    child_voice: list[dict[str, Any]] = []
    risks: list[dict[str, Any]] = []
    strengths: list[dict[str, Any]] = []
    therapeutic_strategies: list[dict[str, Any]] = []
    education_issues: list[dict[str, Any]] = []
    health_issues: list[dict[str, Any]] = []
    family_themes: list[dict[str, Any]] = []
    safeguarding_indicators: list[dict[str, Any]] = []
    behaviour_themes: list[dict[str, Any]] = []
    actions_required: list[dict[str, Any]] = []

    quotes = extract_quotes(voice_text)
    if quotes:
        child_voice.extend([{"quote": q, "theme": "direct child voice", "detail": q} for q in quotes])

    if voice_text and not quotes:
        child_voice.extend(build_evidence_items(split_sentences(voice_text), "child voice"))

    if positives_text:
        strengths.extend(build_evidence_items(split_sentences(positives_text), "strengths / progress"))

    if text_contains_any(full_text, ["calm", "reassured", "supported", "co-regulated", "co regulated", "validated", "space offered"]):
        therapeutic_strategies.append({
            "theme": "therapeutic support used",
            "detail": "The note suggests relational or therapeutic support was offered.",
        })

    if education_text:
        education_issues.extend(build_evidence_items(split_sentences(education_text), "education"))

    if health_text:
        health_issues.extend(build_evidence_items(split_sentences(health_text), "health"))

    if family_text:
        family_themes.extend(build_evidence_items(split_sentences(family_text), "family / identity / relationships"))

    if behaviour_text or presentation_text:
        behaviour_themes.extend(
            build_evidence_items(split_sentences(f"{behaviour_text}\n{presentation_text}"), "behaviour / regulation")
        )

    if actions_text:
        actions_required.extend(build_evidence_items(split_sentences(actions_text), "actions required"))

    risk_keywords = [
        "self-harm", "self harm", "suicidal", "missing", "abscond", "assault", "restraint",
        "aggression", "weapon", "injury", "unsafe", "risk", "threat", "allegation",
        "police", "sexual", "criminal exploitation", "cse", "cce"
    ]
    if text_contains_any(full_text, risk_keywords):
        risks.append({
            "theme": "risk-related content identified",
            "detail": "The note contains wording that may indicate risk themes.",
            "severity": "medium",
        })

    safeguarding_keywords = [
        "injury", "bruise", "mark", "disclosure", "neglect", "abuse",
        "missing", "police", "allegation", "sexual", "exploitation", "fearful"
    ]
    if text_contains_any(full_text, safeguarding_keywords):
        safeguarding_indicators.append({
            "theme": "possible safeguarding indicator",
            "detail": "The note contains wording that may need safeguarding review.",
            "severity": "medium",
        })

    meaningful_conversation_detected = bool(
        voice_text and (
            len(split_sentences(voice_text)) >= 1 or
            text_contains_any(
                voice_text,
                ["feel", "worried", "want", "hope", "family", "school", "future", "upset", "anxious", "sad"]
            )
        )
    )

    suggestions: list[dict[str, Any]] = []

    if meaningful_conversation_detected or child_voice:
        suggestions.append({
            "action_type": "key_worker_session_draft",
            "title": "Create key worker session draft",
            "rationale": "Meaningful child voice or reflective conversation was identified in the Daily Note.",
            "confidence_score": 0.88,
            "evidence": child_voice[:3],
        })

    if risks or safeguarding_indicators:
        suggestions.append({
            "action_type": "risk_assessment_update",
            "title": "Create risk assessment update draft",
            "rationale": "Risk-related content or safeguarding indicators were identified.",
            "confidence_score": 0.84,
            "evidence": (risks + safeguarding_indicators)[:3],
        })

    if health_issues:
        suggestions.append({
            "action_type": "health_record_draft",
            "title": "Create health record draft",
            "rationale": "Health-related information was identified in the Daily Note.",
            "confidence_score": 0.82,
            "evidence": health_issues[:3],
        })

    if education_issues:
        suggestions.append({
            "action_type": "education_record_draft",
            "title": "Create education record draft",
            "rationale": "Education-related themes were identified in the Daily Note.",
            "confidence_score": 0.81,
            "evidence": education_issues[:3],
        })

    if family_themes:
        suggestions.append({
            "action_type": "family_contact_record_draft",
            "title": "Create family contact record draft",
            "rationale": "Family or important relationship themes were identified.",
            "confidence_score": 0.80,
            "evidence": family_themes[:3],
        })

    if text_contains_any(full_text, ["incident", "physical intervention", "restraint", "assault", "damage", "police called"]):
        suggestions.append({
            "action_type": "incident_draft",
            "title": "Create incident draft",
            "rationale": "The note appears to describe an event that may require an incident record.",
            "confidence_score": 0.83,
            "evidence": (risks + behaviour_themes)[:3],
        })

    if actions_required or note.get("significance") in {"important", "significant", "critical"}:
        suggestions.append({
            "action_type": "chronology_entry",
            "title": "Create chronology entry draft",
            "rationale": "This note may contain a significant event or action relevant to the chronology.",
            "confidence_score": 0.76,
            "evidence": (actions_required or child_voice or risks)[:3],
        })

    if safeguarding_indicators:
        suggestions.append({
            "action_type": "manager_alert",
            "title": "Create manager alert draft",
            "rationale": "Possible safeguarding indicators were identified and should be reviewed by a manager.",
            "confidence_score": 0.90,
            "evidence": safeguarding_indicators[:3],
        })

    extracted = {
        "child_voice": child_voice,
        "risks": risks,
        "strengths": strengths,
        "therapeutic_strategies": therapeutic_strategies,
        "education_issues": education_issues,
        "health_issues": health_issues,
        "family_themes": family_themes,
        "safeguarding_indicators": safeguarding_indicators,
        "behaviour_themes": behaviour_themes,
        "actions_required": actions_required,
        "meaningful_conversation_detected": meaningful_conversation_detected,
    }

    return {
        "analysis_status": "completed",
        "extracted": extracted,
        "summary_counts": build_assistant_summary(extracted),
        "suggestions": suggestions,
        "assistant_name": "IndiCare Assistant",
        "confidence_score": 0.85,
    }


def build_linked_draft_payload(action_type: str, daily_note: dict, extracted: dict[str, Any]) -> dict[str, Any]:
    common = {
        "young_person_id": daily_note["young_person_id"],
        "source_daily_note_id": daily_note["id"],
        "source_note_date": str(daily_note.get("note_date") or ""),
        "assistant_disclaimer": (
            "This draft was generated from a Daily Note by the IndiCare assistant. "
            "It must be reviewed and amended by staff before saving."
        ),
    }

    if action_type == "key_worker_session_draft":
        return {
            **common,
            "session_date": str(daily_note.get("note_date") or ""),
            "topic": "Follow-up from Daily Note child voice",
            "child_voice_summary": extracted.get("child_voice", []),
            "themes": (
                extracted.get("behaviour_themes", []) +
                extracted.get("education_issues", []) +
                extracted.get("family_themes", [])
            ),
            "proposed_focus": "Explore the young person's views, feelings and support needs.",
        }

    if action_type == "risk_assessment_update":
        return {
            **common,
            "risk_items": extracted.get("risks", []) + extracted.get("safeguarding_indicators", []),
            "protective_factors": extracted.get("strengths", []),
            "recommended_actions": extracted.get("actions_required", []),
        }

    if action_type == "health_record_draft":
        return {
            **common,
            "health_summary": extracted.get("health_issues", []),
            "actions": extracted.get("actions_required", []),
        }

    if action_type == "education_record_draft":
        return {
            **common,
            "education_summary": extracted.get("education_issues", []),
            "child_voice": extracted.get("child_voice", []),
        }

    if action_type == "family_contact_record_draft":
        return {
            **common,
            "family_themes": extracted.get("family_themes", []),
            "child_voice": extracted.get("child_voice", []),
        }

    if action_type == "chronology_entry":
        return {
            **common,
            "entry_text": daily_note.get("actions_required") or daily_note.get("presentation") or "",
            "significance": extracted.get("actions_required", []) or extracted.get("risks", []),
        }

    if action_type == "incident_draft":
        return {
            **common,
            "incident_date": str(daily_note.get("note_date") or ""),
            "summary": daily_note.get("presentation") or daily_note.get("behaviour_update") or "",
            "behaviour_themes": extracted.get("behaviour_themes", []),
            "risk_items": extracted.get("risks", []) + extracted.get("safeguarding_indicators", []),
            "actions_taken": extracted.get("actions_required", []),
        }

    if action_type == "manager_alert":
        return {
            **common,
            "alert_reason": extracted.get("safeguarding_indicators", []),
            "review_required": True,
        }

    return common


def expire_previous_suggestions(conn, daily_note_id: int) -> None:
    query = """
        UPDATE assistant_suggested_actions
        SET status = 'superseded'
        WHERE daily_note_id = %s
          AND status IN ('suggested', 'accepted')
    """
    with conn.cursor() as cur:
        cur.execute(query, (daily_note_id,))


def store_analysis_and_suggestions(conn, daily_note_id: int, analysis_result: dict[str, Any]) -> dict[str, Any]:
    now = utcnow()
    assistant_name = analysis_result.get("assistant_name", "IndiCare Assistant")
    analysis_status = analysis_result.get("analysis_status", "completed")
    extracted = analysis_result.get("extracted", {})
    confidence_score = analysis_result.get("confidence_score", 0.85)
    suggestions = analysis_result.get("suggestions", [])

    expire_previous_suggestions(conn, daily_note_id)

    analysis_query = """
        INSERT INTO assistant_note_analysis (
            daily_note_id,
            assistant_name,
            analysis_status,
            extracted_json,
            confidence_score,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s)
        RETURNING id
    """

    with conn.cursor() as cur:
        cur.execute(
            analysis_query,
            (
                daily_note_id,
                assistant_name,
                analysis_status,
                json.dumps(extracted),
                confidence_score,
                now,
                now,
            ),
        )
        analysis_row = cur.fetchone()

        suggestion_query = """
            INSERT INTO assistant_suggested_actions (
                daily_note_id,
                analysis_id,
                action_type,
                title,
                rationale,
                confidence_score,
                status,
                suggested_payload,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'suggested', %s::jsonb, %s)
        """

        for suggestion in suggestions:
            cur.execute(
                suggestion_query,
                (
                    daily_note_id,
                    analysis_row["id"],
                    suggestion.get("action_type"),
                    suggestion.get("title"),
                    suggestion.get("rationale"),
                    suggestion.get("confidence_score"),
                    json.dumps(suggestion),
                    now,
                ),
            )

    return analysis_row


# -------------------------------------------------------------------
# Existing CRUD + improved workflow
# -------------------------------------------------------------------

@router.get("/{young_person_id}/daily-notes")
def list_daily_notes(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            dn.*,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name,
            approver.first_name AS approved_by_first_name,
            approver.last_name AS approved_by_last_name
        FROM daily_notes dn
        LEFT JOIN users u ON dn.author_id = u.id
        LEFT JOIN users approver ON dn.approved_by = approver.id
        WHERE dn.young_person_id = %s
        ORDER BY dn.note_date DESC, dn.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}/daily-notes/current")
def get_current_daily_note_for_young_person(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            dn.*,
            u.first_name AS author_first_name,
            u.last_name AS author_last_name,
            approver.first_name AS approved_by_first_name,
            approver.last_name AS approved_by_last_name
        FROM daily_notes dn
        LEFT JOIN users u ON dn.author_id = u.id
        LEFT JOIN users approver ON dn.approved_by = approver.id
        WHERE dn.young_person_id = %s
        ORDER BY
            CASE
                WHEN dn.workflow_status IN ('draft', 'returned', 'submitted') THEN 0
                ELSE 1
            END,
            dn.note_date DESC,
            dn.id DESC
        LIMIT 1
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        row = cur.fetchone()

    if not row:
        return None

    row["author_name"] = format_author_name(row, "author_first_name", "author_last_name")
    row["approved_by_name"] = format_author_name(row, "approved_by_first_name", "approved_by_last_name")
    return row


@router.get("/daily-notes/{daily_note_id}")
def get_daily_note(
    daily_note_id: int,
    conn=Depends(get_db),
):
    row = get_daily_note_row(conn, daily_note_id)

    if not row:
        raise HTTPException(status_code=404, detail="Daily note not found")

    row["author_name"] = format_author_name(row, "author_first_name", "author_last_name")
    row["approved_by_name"] = format_author_name(row, "approved_by_first_name", "approved_by_last_name")
    return row


@router.post("/daily-notes")
def create_daily_note(
    payload: DailyNoteCreate,
    conn=Depends(get_db),
):
    now = utcnow()
    workflow_status = payload.workflow_status or "draft"

    submitted_at = now if workflow_status == "submitted" else None
    approved_at = now if workflow_status == "approved" else None
    returned_at = now if workflow_status == "returned" else None

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
            author_id,
            workflow_status,
            manager_review_comment,
            approved_by,
            approved_at,
            returned_at,
            submitted_at,
            last_edited_at,
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
        payload.note_date,
        payload.shift_type,
        payload.mood,
        payload.presentation,
        payload.activities,
        payload.education_update,
        payload.health_update,
        payload.family_update,
        payload.behaviour_update,
        payload.young_person_voice,
        payload.positives,
        payload.actions_required,
        payload.significance,
        payload.author_id,
        workflow_status,
        payload.manager_review_comment,
        payload.approved_by,
        approved_at,
        returned_at,
        submitted_at,
        now,
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
        raise HTTPException(status_code=500, detail=f"Failed to create daily note: {str(e)}")

    created = get_daily_note_row(conn, new_row["id"])
    if created:
        created["author_name"] = format_author_name(created, "author_first_name", "author_last_name")
        created["approved_by_name"] = format_author_name(created, "approved_by_first_name", "approved_by_last_name")

    return created or {"message": "Daily note created successfully", "id": new_row["id"]}


@router.put("/daily-notes/{daily_note_id}")
def update_daily_note(
    daily_note_id: int,
    payload: DailyNoteUpdate,
    conn=Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    now = utcnow()
    update_data["updated_at"] = now
    update_data = apply_workflow_timestamps(update_data, now)

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
            updated_row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update daily note: {str(e)}")

    if not updated_row:
        raise HTTPException(status_code=404, detail="Daily note not found")

    updated = get_daily_note_row(conn, updated_row["id"])
    if updated:
        updated["author_name"] = format_author_name(updated, "author_first_name", "author_last_name")
        updated["approved_by_name"] = format_author_name(updated, "approved_by_first_name", "approved_by_last_name")
    return updated or {"message": "Daily note updated successfully", "id": updated_row["id"]}


@router.post("/daily-notes/{daily_note_id}/submit")
def submit_daily_note(
    daily_note_id: int,
    conn=Depends(get_db),
):
    now = utcnow()
    query = """
        UPDATE daily_notes
        SET
            workflow_status = 'submitted',
            submitted_at = %s,
            last_edited_at = %s,
            updated_at = %s
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (now, now, now, daily_note_id))
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit daily note: {str(e)}")

    if not row:
        raise HTTPException(status_code=404, detail="Daily note not found")

    return {"message": "Daily note submitted for review", "id": row["id"], "status": "submitted"}


@router.post("/daily-notes/{daily_note_id}/approve")
def approve_daily_note(
    daily_note_id: int,
    payload: DailyNoteUpdate | None = None,
    conn=Depends(get_db),
):
    now = utcnow()
    approved_by = payload.approved_by if payload else None

    query = """
        UPDATE daily_notes
        SET
            workflow_status = 'approved',
            approved_by = COALESCE(%s, approved_by),
            approved_at = %s,
            last_edited_at = %s,
            updated_at = %s
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (approved_by, now, now, now, daily_note_id))
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve daily note: {str(e)}")

    if not row:
        raise HTTPException(status_code=404, detail="Daily note not found")

    return {"message": "Daily note approved", "id": row["id"], "status": "approved"}


@router.post("/daily-notes/{daily_note_id}/return")
def return_daily_note(
    daily_note_id: int,
    payload: ReturnDailyNotePayload,
    conn=Depends(get_db),
):
    now = utcnow()
    query = """
        UPDATE daily_notes
        SET
            workflow_status = 'returned',
            manager_review_comment = %s,
            returned_at = %s,
            last_edited_at = %s,
            updated_at = %s
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    payload.manager_review_comment,
                    now,
                    now,
                    now,
                    daily_note_id,
                ),
            )
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return daily note for edits: {str(e)}")

    if not row:
        raise HTTPException(status_code=404, detail="Daily note not found")

    return {"message": "Daily note returned for edits", "id": row["id"], "status": "returned"}


# -------------------------------------------------------------------
# Assistant-linked analysis + suggestions
# -------------------------------------------------------------------

@router.post("/daily-notes/{daily_note_id}/assistant-analyse")
def assistant_analyse_daily_note(
    daily_note_id: int,
    conn=Depends(get_db),
):
    note = get_daily_note_row(conn, daily_note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Daily note not found")

    try:
        analysis_result = run_assistant_analysis(note)
        store_analysis_and_suggestions(conn, daily_note_id, analysis_result)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to analyse daily note: {str(e)}")

    return {
        "message": "Assistant analysis completed",
        "daily_note_id": daily_note_id,
        "analysis_status": analysis_result["analysis_status"],
        "suggestion_count": len(analysis_result.get("suggestions", [])),
    }


@router.get("/daily-notes/{daily_note_id}/assistant-analysis")
def get_daily_note_assistant_analysis(
    daily_note_id: int,
    conn=Depends(get_db),
):
    note = get_daily_note_row(conn, daily_note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Daily note not found")

    analysis = get_latest_analysis_row(conn, daily_note_id)

    if not analysis:
        return {
            "daily_note_id": daily_note_id,
            "analysis_status": "not_started",
            "assistant_name": "IndiCare Assistant",
            "extracted": {
                "child_voice": [],
                "risks": [],
                "strengths": [],
                "therapeutic_strategies": [],
                "education_issues": [],
                "health_issues": [],
                "family_themes": [],
                "safeguarding_indicators": [],
                "behaviour_themes": [],
                "actions_required": [],
                "meaningful_conversation_detected": False,
            },
            "confidence_score": None,
        }

    return {
        "daily_note_id": daily_note_id,
        "analysis_status": analysis.get("analysis_status"),
        "assistant_name": analysis.get("assistant_name"),
        "extracted": analysis.get("extracted_json", {}),
        "confidence_score": float(analysis["confidence_score"]) if analysis.get("confidence_score") is not None else None,
    }


@router.get("/daily-notes/{daily_note_id}/assistant-suggestions")
def get_daily_note_assistant_suggestions(
    daily_note_id: int,
    conn=Depends(get_db),
):
    note = get_daily_note_row(conn, daily_note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Daily note not found")

    query = """
        SELECT *
        FROM assistant_suggested_actions
        WHERE daily_note_id = %s
          AND status IN ('suggested', 'accepted')
        ORDER BY created_at DESC, id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (daily_note_id,))
        rows = cur.fetchall()

    items = []
    for row in rows:
        payload = row.get("suggested_payload") or {}
        items.append({
            "id": row["id"],
            "action_type": row.get("action_type"),
            "title": row.get("title"),
            "rationale": row.get("rationale"),
            "confidence_score": float(row["confidence_score"]) if row.get("confidence_score") is not None else None,
            "status": row.get("status"),
            "evidence": payload.get("evidence", []),
            "suggested_payload": payload,
        })

    return {"items": items}


@router.post("/daily-notes/{daily_note_id}/assistant-suggestions/{suggestion_id}/dismiss")
def dismiss_assistant_suggestion(
    daily_note_id: int,
    suggestion_id: int,
    conn=Depends(get_db),
):
    suggestion = get_suggestion_row(conn, suggestion_id, daily_note_id)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Assistant suggestion not found")

    query = """
        UPDATE assistant_suggested_actions
        SET status = 'dismissed', reviewed_at = %s
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (utcnow(), suggestion_id))
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to dismiss suggestion: {str(e)}")

    return {"message": "Suggestion dismissed", "id": row["id"]}


@router.post("/daily-notes/{daily_note_id}/assistant-suggestions/{suggestion_id}/accept")
def accept_assistant_suggestion(
    daily_note_id: int,
    suggestion_id: int,
    conn=Depends(get_db),
):
    note = get_daily_note_row(conn, daily_note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Daily note not found")

    analysis = get_latest_analysis_row(conn, daily_note_id)
    if not analysis:
        raise HTTPException(status_code=400, detail="No assistant analysis found for this daily note")

    suggestion = get_suggestion_row(conn, suggestion_id, daily_note_id)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Assistant suggestion not found")

    extracted = analysis.get("extracted_json") or {}
    action_type = suggestion.get("action_type")
    form_data = build_linked_draft_payload(action_type, note, extracted)
    now = utcnow()

    insert_query = """
        INSERT INTO linked_record_drafts (
            suggestion_id,
            daily_note_id,
            young_person_id,
            record_type,
            target_module,
            draft_status,
            form_data,
            assistant_disclaimer,
            created_at,
            updated_at
        )
        VALUES (
            %s, %s, %s, %s, %s, 'draft_assistant_generated', %s::jsonb, %s, %s, %s
        )
        RETURNING id
    """

    suggestion_update_query = """
        UPDATE assistant_suggested_actions
        SET status = 'accepted', reviewed_at = %s
        WHERE id = %s
    """

    source_link_query = """
        INSERT INTO source_record_links (
            source_type,
            source_id,
            target_type,
            target_id,
            link_type,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    try:
        with conn.cursor() as cur:
            cur.execute(
                insert_query,
                (
                    suggestion_id,
                    daily_note_id,
                    note["young_person_id"],
                    action_type,
                    action_type,
                    json.dumps(form_data),
                    form_data.get("assistant_disclaimer"),
                    now,
                    now,
                ),
            )
            draft_row = cur.fetchone()

            cur.execute(suggestion_update_query, (now, suggestion_id))
            cur.execute(
                source_link_query,
                (
                    "daily_note",
                    daily_note_id,
                    "linked_record_draft",
                    draft_row["id"],
                    "assistant_generated_from",
                    now,
                ),
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create linked draft: {str(e)}")

    return {"message": "Linked draft created", "draft_id": draft_row["id"]}


@router.get("/daily-notes/{daily_note_id}/linked-records")
def get_daily_note_linked_records(
    daily_note_id: int,
    conn=Depends(get_db),
):
    note = get_daily_note_row(conn, daily_note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Daily note not found")

    query = """
        SELECT *
        FROM linked_record_drafts
        WHERE daily_note_id = %s
          AND draft_status <> 'discarded'
        ORDER BY created_at DESC, id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (daily_note_id,))
        rows = cur.fetchall()

    items = []
    for row in rows:
        items.append({
            "id": row["id"],
            "record_type": row.get("record_type"),
            "target_module": row.get("target_module"),
            "draft_status": row.get("draft_status"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        })

    return {"items": items}


# -------------------------------------------------------------------
# Linked draft CRUD
# -------------------------------------------------------------------

@router.get("/daily-notes/linked-drafts/{draft_id}")
def get_linked_draft(
    draft_id: int,
    conn=Depends(get_db),
):
    draft = get_linked_draft_row(conn, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Linked draft not found")

    return {
        "id": draft["id"],
        "suggestion_id": draft.get("suggestion_id"),
        "daily_note_id": draft.get("daily_note_id"),
        "young_person_id": draft.get("young_person_id"),
        "record_type": draft.get("record_type"),
        "target_module": draft.get("target_module"),
        "draft_status": draft.get("draft_status"),
        "form_data": draft.get("form_data") or {},
        "source_note_date": str(draft.get("source_note_date") or ""),
        "created_at": draft.get("created_at"),
        "updated_at": draft.get("updated_at"),
    }


@router.put("/daily-notes/linked-drafts/{draft_id}")
def update_linked_draft(
    draft_id: int,
    payload: LinkedDraftUpdate,
    conn=Depends(get_db),
):
    draft = get_linked_draft_row(conn, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Linked draft not found")

    now = utcnow()
    current_data = draft.get("form_data") or {}
    merged = {**current_data, **payload.form_data}

    query = """
        UPDATE linked_record_drafts
        SET form_data = %s::jsonb, updated_at = %s
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (json.dumps(merged), now, draft_id))
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update linked draft: {str(e)}")

    return {"message": "Linked draft updated", "id": row["id"]}


@router.post("/daily-notes/linked-drafts/{draft_id}/discard")
def discard_linked_draft(
    draft_id: int,
    conn=Depends(get_db),
):
    draft = get_linked_draft_row(conn, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Linked draft not found")

    query = """
        UPDATE linked_record_drafts
        SET draft_status = 'discarded', updated_at = %s
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (utcnow(), draft_id))
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to discard linked draft: {str(e)}")

    return {"message": "Linked draft discarded", "id": row["id"]}
