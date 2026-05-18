from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.os_sync_hooks import sync_after_save
from services.workflow_response import gold_standard_response
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Handover"])


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


def _actor_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("user_id") or current_user.get("id"))


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")


def _assert_can_review(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to review this record")


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _load_and_check_handover(
    conn,
    handover_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                h.*,
                yp.home_id
            FROM handover_records h
            JOIN young_people yp ON yp.id = h.young_person_id
            WHERE h.id = %s
            LIMIT 1
            """,
            (handover_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Handover not found")

    item = _normalise_handover_row(dict(row))
    _assert_home_access(current_user, _safe_int(item.get("home_id")))
    return item


def _normalise_handover_row(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {}

    item = {
        "id": row.get("id"),
        "young_person_id": row.get("young_person_id"),
        "home_id": row.get("home_id"),
        "handover_date": row.get("handover_date"),
        "shift_type": row.get("shift_type"),
        "title": row.get("title"),
        "summary_text": row.get("summary_text"),
        "summary": row.get("summary_text"),
        "status": row.get("status") or "draft",
        "workflow_status": row.get("status") or "draft",
        "source_window_start": row.get("source_window_start"),
        "source_window_end": row.get("source_window_end"),
        "generated_by": row.get("generated_by"),
        "approved_by": row.get("approved_by"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "record_type": "handover_record",
        "recorded_at": row.get("handover_date") or row.get("created_at"),
    }
    return item


def _sync_handover(item: dict[str, Any]) -> dict[str, Any]:
    try:
        ok = sync_after_save("handover_records", item)
        return {"attempted": True, "ok": bool(ok), "source_table": "handover_records"}
    except Exception as error:
        return {"attempted": True, "ok": False, "source_table": "handover_records", "error": str(error)}


def _link_handover_event(conn, *, item: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    status = str(item.get("status") or "draft").lower()
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=int(item["young_person_id"]),
        source_table="handover_records",
        source_id=int(item["id"]),
        event_type=event_type,
        title=f"Handover {event_type}: {item.get('title') or 'Shift handover'}",
        summary=item.get("summary_text") or f"Handover {event_type}",
        narrative=item.get("summary_text") or f"Handover {event_type}",
        category="handover",
        subcategory=item.get("shift_type") or "shift",
        significance="medium" if status not in {"returned", "archived"} else "high",
        due_date=item.get("handover_date"),
        owner_id=item.get("generated_by"),
        created_by=_actor_id(current_user),
        workflow={
            "link_chronology": True,
            "create_task": status in {"submitted", "returned"},
            "manager_review": status in {"submitted", "returned", "approved"},
            "safeguarding": False,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "handover_status": status,
            "shift_type": item.get("shift_type"),
            "quality_standards": ["leadership_and_management"],
            "standards_rationale": "Linked from young person handover workflow",
            "evidence_strength": "medium",
        },
    )
    conn.commit()
    return workflow


def _handover_response(
    *,
    item: dict[str, Any],
    workflow: dict[str, Any] | None = None,
    sync: dict[str, Any] | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow=workflow or {},
        sync=sync or {},
        handover=item,
        handover_record=item,
    )


def _update_handover_status(conn, handover_id: int, status: str, current_user: dict[str, Any]) -> dict[str, Any]:
    approved_by = _actor_id(current_user) if status == "approved" else None
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE handover_records
            SET status = %s,
                approved_by = COALESCE(%s, approved_by),
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (status, approved_by, handover_id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Handover not found")

    conn.commit()
    return _normalise_handover_row(dict(row))


class GenerateHandoverPayload(BaseModel):
    shift_type: str | None = "day"
    title: str | None = "Shift Handover"


class HandoverUpdatePayload(BaseModel):
    shift_type: str | None = None
    title: str | None = None
    summary_text: str | None = None
    status: str | None = None


class HandoverDecisionPayload(BaseModel):
    review_note: str | None = None


@router.get("/{young_person_id}/handover")
def get_handover_records(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    h.id,
                    h.young_person_id,
                    yp.home_id,
                    h.handover_date,
                    h.shift_type,
                    h.title,
                    h.summary_text,
                    h.status,
                    h.source_window_start,
                    h.source_window_end,
                    h.generated_by,
                    h.approved_by,
                    h.created_at,
                    h.updated_at
                FROM handover_records h
                JOIN young_people yp ON yp.id = h.young_person_id
                WHERE h.young_person_id = %s
                  AND COALESCE(h.status, 'draft') <> 'archived'
                ORDER BY h.handover_date DESC, h.created_at DESC, h.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        items = [_normalise_handover_row(dict(row)) for row in rows]
        return {"ok": True, "items": items, "handover_records": items, "count": len(items)}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load handover: {str(exc)}")


@router.get("/{young_person_id}/handover/archive")
def get_archived_handover_records(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT h.*, yp.home_id
                FROM handover_records h
                JOIN young_people yp ON yp.id = h.young_person_id
                WHERE h.young_person_id = %s
                  AND COALESCE(h.status, '') = 'archived'
                ORDER BY h.updated_at DESC NULLS LAST, h.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        items = [_normalise_handover_row(dict(row)) for row in rows]
        return {"ok": True, "items": items, "handover_records": items, "count": len(items)}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load archived handover: {str(exc)}")


@router.get("/handover/{handover_id}")
def get_handover_record(
    handover_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = _load_and_check_handover(conn, handover_id, current_user)
    return _handover_response(item=item, message="Handover loaded")


@router.post("/{young_person_id}/handover")
@router.post("/{young_person_id}/handover/generate")
def generate_handover_record(
    young_person_id: int,
    payload: GenerateHandoverPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    payload = payload or GenerateHandoverPayload()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
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
                    workflow_status,
                    created_at
                FROM daily_notes
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY note_date DESC, created_at DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            daily_rows = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    incident_datetime,
                    incident_type,
                    description,
                    staff_response,
                    outcome,
                    severity,
                    manager_review_status,
                    created_at
                FROM incidents
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY incident_datetime DESC, created_at DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            incident_rows = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    session_date,
                    topic,
                    summary,
                    child_voice,
                    reflective_analysis,
                    actions_agreed,
                    status,
                    created_at
                FROM keywork_sessions
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY session_date DESC, created_at DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            keywork_rows = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    title,
                    concern_summary,
                    severity,
                    status,
                    approval_status,
                    updated_at
                FROM risk_assessments
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY updated_at DESC, id DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            risk_rows = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    title,
                    description,
                    severity,
                    is_active,
                    review_date,
                    created_at
                FROM young_person_alerts
                WHERE young_person_id = %s
                  AND COALESCE(is_active, TRUE) = TRUE
                ORDER BY
                    COALESCE(review_date, CURRENT_DATE) ASC,
                    created_at DESC,
                    id DESC
                LIMIT 5
                """,
                (young_person_id,),
            )
            alert_rows = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    title,
                    summary,
                    review_date,
                    status,
                    approval_status,
                    updated_at
                FROM support_plans
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY
                    review_date ASC NULLS LAST,
                    updated_at DESC,
                    id DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            plan_rows = cur.fetchall() or []

            parts: list[str] = []

            if alert_rows:
                alert_text = "; ".join(
                    [
                        f"{row.get('title') or 'Alert'} ({row.get('severity') or 'standard'})"
                        for row in alert_rows
                    ]
                )
                parts.append(f"Active alerts: {alert_text}.")

            if risk_rows:
                risk_text = "; ".join(
                    [
                        f"{row.get('title') or 'Risk'} - {row.get('concern_summary') or 'No summary recorded'}"
                        for row in risk_rows
                    ]
                )
                parts.append(f"Current risks: {risk_text}.")

            if plan_rows:
                plan_text = "; ".join(
                    [
                        f"{row.get('title') or 'Plan'} ({row.get('approval_status') or row.get('status') or 'draft'})"
                        for row in plan_rows
                    ]
                )
                parts.append(f"Current plans: {plan_text}.")

            latest_daily = daily_rows[0] if daily_rows else None
            if latest_daily:
                presentation = latest_daily.get("presentation") or latest_daily.get("mood") or "No presentation recorded"
                activities = latest_daily.get("activities") or "No activity detail recorded"
                parts.append(f"Presentation and daily living: {presentation}. Activities included {activities}.")

                if latest_daily.get("education_update"):
                    parts.append(f"Education: {latest_daily.get('education_update')}")
                if latest_daily.get("health_update"):
                    parts.append(f"Health: {latest_daily.get('health_update')}")
                if latest_daily.get("family_update"):
                    parts.append(f"Family/contact: {latest_daily.get('family_update')}")
                if latest_daily.get("behaviour_update"):
                    parts.append(f"Behaviour/regulation: {latest_daily.get('behaviour_update')}")
                if latest_daily.get("young_person_voice"):
                    parts.append(f"Young person's voice: {latest_daily.get('young_person_voice')}")
                if latest_daily.get("positives"):
                    parts.append(f"Positives: {latest_daily.get('positives')}")
                if latest_daily.get("actions_required"):
                    parts.append(f"Actions for next shift: {latest_daily.get('actions_required')}")

            latest_incident = incident_rows[0] if incident_rows else None
            if latest_incident:
                incident_type = latest_incident.get("incident_type") or "Incident"
                description = latest_incident.get("description") or "No description recorded"
                staff_response = latest_incident.get("staff_response") or "No staff response recorded"
                outcome = latest_incident.get("outcome")
                incident_text = f"Recent incident: {incident_type}. {description}. Staff response: {staff_response}"
                if outcome:
                    incident_text += f" Outcome: {outcome}"
                parts.append(incident_text)

            latest_keywork = keywork_rows[0] if keywork_rows else None
            if latest_keywork:
                topic = latest_keywork.get("topic") or "Key work"
                summary = latest_keywork.get("summary") or latest_keywork.get("reflective_analysis") or "No summary recorded"
                actions = latest_keywork.get("actions_agreed")
                keywork_text = f"Recent key work focus: {topic}. {summary}"
                if actions:
                    keywork_text += f" Actions agreed: {actions}"
                parts.append(keywork_text)

            summary_text = " ".join(parts) if parts else "No recent records were available to generate a handover summary."
            actor_user_id = _actor_id(current_user)

            cur.execute(
                """
                INSERT INTO handover_records (
                    young_person_id,
                    handover_date,
                    shift_type,
                    title,
                    summary_text,
                    status,
                    source_window_start,
                    source_window_end,
                    generated_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s,
                    CURRENT_DATE,
                    %s,
                    %s,
                    %s,
                    'draft',
                    NOW() - INTERVAL '7 days',
                    NOW(),
                    %s,
                    NOW(),
                    NOW()
                )
                RETURNING *
                """,
                (
                    young_person_id,
                    payload.shift_type or "day",
                    payload.title or "Shift Handover",
                    summary_text,
                    actor_user_id,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        item = _normalise_handover_row(dict(row)) if row else {}
        workflow = _link_handover_event(conn, item=item, event_type="created", current_user=current_user)
        sync = _sync_handover(item)
        return _handover_response(item=item, workflow=workflow, sync=sync, message="Handover generated")

    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate handover: {str(exc)}")


@router.patch("/handover/{handover_id}")
@router.put("/handover/{handover_id}")
def update_handover(
    handover_id: int,
    payload: HandoverUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_handover(conn, handover_id, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")

    allowed = {"shift_type", "title", "summary_text", "status"}
    updates = {key: value for key, value in updates.items() if key in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No supported changes provided")

    try:
        set_parts: list[str] = []
        values: list[Any] = []
        for field, value in updates.items():
            set_parts.append(f"{field} = %s")
            values.append(value)
        set_parts.append("updated_at = NOW()")
        values.append(handover_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE handover_records
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()
        conn.commit()
        item = _normalise_handover_row(dict(row)) if row else {}
        workflow = _link_handover_event(conn, item=item, event_type="updated", current_user=current_user)
        sync = _sync_handover(item)
        return _handover_response(item=item, workflow=workflow, sync=sync, message="Handover updated")
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update handover: {str(exc)}")


@router.put("/handover/{handover_id}/submit")
@router.post("/handover/{handover_id}/submit")
def submit_handover(
    handover_id: int,
    payload: HandoverDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_handover(conn, handover_id, current_user)
    item = _update_handover_status(conn, handover_id, "submitted", current_user)
    workflow = _link_handover_event(conn, item=item, event_type="submitted", current_user=current_user)
    sync = _sync_handover(item)
    return _handover_response(item=item, workflow=workflow, sync=sync, message="Handover submitted")


@router.put("/handover/{handover_id}/approve")
@router.post("/handover/{handover_id}/approve")
def approve_handover(
    handover_id: int,
    payload: HandoverDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_handover(conn, handover_id, current_user)
    item = _update_handover_status(conn, handover_id, "approved", current_user)
    workflow = _link_handover_event(conn, item=item, event_type="approved", current_user=current_user)
    sync = _sync_handover(item)
    return _handover_response(item=item, workflow=workflow, sync=sync, message="Handover approved")


@router.put("/handover/{handover_id}/return")
@router.post("/handover/{handover_id}/return")
def return_handover(
    handover_id: int,
    payload: HandoverDecisionPayload | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_handover(conn, handover_id, current_user)
    item = _update_handover_status(conn, handover_id, "returned", current_user)
    workflow = _link_handover_event(conn, item=item, event_type="returned", current_user=current_user)
    sync = _sync_handover(item)
    return _handover_response(item=item, workflow=workflow, sync=sync, message="Handover returned")


@router.put("/handover/{handover_id}/archive")
@router.post("/handover/{handover_id}/archive")
def archive_handover(
    handover_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_review(current_user)
    _load_and_check_handover(conn, handover_id, current_user)
    item = _update_handover_status(conn, handover_id, "archived", current_user)
    workflow = _link_handover_event(conn, item=item, event_type="archived", current_user=current_user)
    sync = _sync_handover(item)
    return _handover_response(item=item, workflow=workflow, sync=sync, message="Handover archived")
