from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService
from services.young_person_daily_notes_service import YoungPersonDailyNotesService
from services.young_people_chronology_service import get_young_person_timeline

router = APIRouter(prefix="/young-people", tags=["Young People Chronology"])


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _child_display_name(record: dict[str, Any]) -> str:
    return " ".join([str(record.get("first_name") or "").strip(), str(record.get("last_name") or "").strip()]).strip() or f"Young person {record.get('id')}"


def _journey_timeline(young_person_id: int) -> list[dict[str, Any]]:
    rows = get_young_person_timeline(young_person_id=young_person_id, limit=80)
    items = []
    for row in rows:
        source_id = row.get("source_id") or row.get("id")
        items.append(
            {
                "id": str(row.get("id")),
                "title": row.get("title") or "Record",
                "summary": row.get("summary") or "This record is not available yet.",
                "category": row.get("category") or row.get("event_type") or "record",
                "severity": row.get("severity") or "medium",
                "occurredAt": row.get("occurred_at"),
                "href": f"/young-people/{young_person_id}/chronology?source={source_id}",
            }
        )
    return items


def _journey_daily_notes(conn, young_person_id: int) -> list[dict[str, Any]]:
    notes = YoungPersonDailyNotesService.list_daily_notes_for_young_person(conn, young_person_id=young_person_id)
    return [
        {
            "id": str(note.get("id")),
            "title": note.get("title") or "Daily note",
            "summary": note.get("summary") or "Daily note recorded.",
            "noteDate": note.get("note_date"),
            "workflowStatus": note.get("workflow_status") or "recorded",
            "href": f"/young-people/{young_person_id}/chronology?source={note.get('id')}",
        }
        for note in notes[:12]
    ]


def _journey_actions(conn, young_person_id: int) -> list[dict[str, Any]]:
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, task, status, due_date
                FROM tasks
                WHERE young_person_id = %s
                  AND LOWER(COALESCE(status, 'open')) NOT IN ('completed', 'closed', 'archived')
                ORDER BY due_date ASC NULLS LAST, id DESC
                LIMIT 12
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []
    except Exception:
        conn.rollback()
        return []
    return [
        {
            "id": str(row.get("id")),
            "title": row.get("title") or "Follow-up action",
            "description": row.get("task") or "Open action for review or completion.",
            "status": row.get("status") or "open",
            "href": f"/actions/{row.get('id')}",
        }
        for row in rows
    ]


def _journey_evidence(conn, young_person_id: int) -> list[dict[str, Any]]:
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, linked_regulation
                FROM evidence_items
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 12
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []
    except Exception:
        conn.rollback()
        return []
    return [
        {
            "id": str(row.get("id")),
            "title": row.get("title") or "Evidence item",
            "description": row.get("description"),
            "linkedRegulation": row.get("linked_regulation"),
        }
        for row in rows
    ]


@router.get("/{young_person_id}/timeline")
def list_young_person_timeline(
    young_person_id: int,
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    record_type: str = Query(""),
    search: str = Query(""),
    limit: int = Query(250, ge=1, le=1000),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        rows = get_young_person_timeline(
            young_person_id=young_person_id,
            date_from=date_from,
            date_to=date_to,
            record_type=record_type,
            search=search,
            limit=limit,
        )

        return {
            "timeline": rows,
            "items": rows,
            "count": len(rows),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load timeline: {str(e)}")


@router.get("/{young_person_id}/journey")
def get_young_person_journey(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    person = _load_and_check_young_person(young_person_id, current_user)
    display_name = _child_display_name(person)
    return {
        "child": {
            **person,
            "display_name": display_name,
            "preferred_name": person.get("preferred_name") or person.get("first_name") or display_name,
        },
        "dailyNotes": _journey_daily_notes(conn, young_person_id),
        "timeline": _journey_timeline(young_person_id),
        "actions": _journey_actions(conn, young_person_id),
        "evidence": _journey_evidence(conn, young_person_id),
    }
