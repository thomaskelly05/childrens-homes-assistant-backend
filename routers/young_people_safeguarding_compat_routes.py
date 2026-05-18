from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Body

from auth.current_user import get_current_user
from db.connection import get_db
from services.os_sync_hooks import sync_after_save
from services.workflow_response import gold_standard_response
from services.young_people_linking_service import YoungPeopleLinkingService

router = APIRouter(prefix="/young-people", tags=["Young People Safeguarding"])


SAFE_STATUSES = {"draft", "submitted", "approved", "returned", "archived", "open", "closed"}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _actor_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    if _role(current_user) not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to edit safeguarding records")


def _assert_can_review(current_user: dict[str, Any]) -> None:
    if _role(current_user) not in {"admin", "provider_admin", "manager"}:
        raise HTTPException(status_code=403, detail="You do not have permission to review safeguarding records")


def _ensure_schema(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS safeguarding_records (
                id SERIAL PRIMARY KEY,
                young_person_id INTEGER NOT NULL,
                home_id INTEGER,
                title TEXT NOT NULL DEFAULT 'Safeguarding record',
                category TEXT DEFAULT 'safeguarding',
                severity TEXT DEFAULT 'high',
                concern_summary TEXT,
                narrative TEXT,
                child_voice TEXT,
                actions_taken TEXT,
                status TEXT NOT NULL DEFAULT 'draft',
                workflow_status TEXT NOT NULL DEFAULT 'draft',
                manager_review_comment TEXT,
                archived BOOLEAN NOT NULL DEFAULT FALSE,
                created_by INTEGER,
                approved_by INTEGER,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                reviewed_at TIMESTAMPTZ
            )
            """
        )
        cur.execute("CREATE INDEX IF NOT EXISTS idx_safeguarding_records_yp ON safeguarding_records (young_person_id, archived, updated_at DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_safeguarding_records_status ON safeguarding_records (status, workflow_status)")
    conn.commit()


def _young_person_scope(conn, young_person_id: int) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute("SELECT id, home_id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")
    return dict(row)


def _assert_home_access(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    scope = _young_person_scope(conn, young_person_id)
    if _role(current_user) in {"admin", "provider_admin"}:
        return scope
    user_home_id = _safe_int(current_user.get("home_id"))
    if user_home_id != _safe_int(scope.get("home_id")):
        raise HTTPException(status_code=403, detail="You do not have access to this young person")
    return scope


def _shape(row: dict[str, Any] | None) -> dict[str, Any]:
    item = dict(row or {})
    item.setdefault("record_type", "safeguarding_record")
    item.setdefault("title", item.get("title") or "Safeguarding record")
    item.setdefault("summary", item.get("concern_summary") or item.get("narrative") or "Safeguarding record")
    item.setdefault("workflow_status", item.get("workflow_status") or item.get("status") or "draft")
    item.setdefault("status", item.get("status") or item.get("workflow_status") or "draft")
    item.setdefault("recorded_at", item.get("created_at") or item.get("updated_at"))
    return item


def _load_record(conn, record_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    _ensure_schema(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM safeguarding_records WHERE id = %s LIMIT 1", (record_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Safeguarding record not found")
    item = _shape(dict(row))
    _assert_home_access(conn, int(item["young_person_id"]), current_user)
    return item


def _sync(item: dict[str, Any]) -> dict[str, Any]:
    try:
        ok = sync_after_save("safeguarding_records", item)
        return {"attempted": True, "ok": bool(ok), "source_table": "safeguarding_records"}
    except Exception as error:
        return {"attempted": True, "ok": False, "source_table": "safeguarding_records", "error": str(error)}


def _link(conn, *, item: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    severity = str(item.get("severity") or "high").lower()
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=int(item["young_person_id"]),
        source_table="safeguarding_records",
        source_id=int(item["id"]),
        event_type=event_type,
        title=f"Safeguarding {event_type}: {item.get('title') or 'Safeguarding record'}",
        summary=item.get("concern_summary") or item.get("summary") or f"Safeguarding record {event_type}",
        narrative=item.get("narrative") or item.get("concern_summary") or f"Safeguarding record {event_type}",
        category="safeguarding",
        subcategory=item.get("category") or "safeguarding",
        significance="high" if severity in {"high", "critical"} else "medium",
        owner_id=item.get("created_by"),
        created_by=_actor_id(current_user),
        workflow={
            "link_chronology": True,
            "create_task": str(item.get("workflow_status") or "").lower() in {"submitted", "returned"},
            "manager_review": True,
            "safeguarding": True,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "severity": severity,
            "safeguarding_category": item.get("category"),
            "workflow_status": item.get("workflow_status"),
            "quality_standards": ["protection_of_children"],
            "standards_rationale": "Linked from safeguarding workflow",
            "evidence_strength": "strong",
            "judgement_areas": ["helped_and_protected"],
        },
    )
    conn.commit()
    return workflow


def _response(*, item: dict[str, Any], workflow: dict[str, Any] | None = None, sync: dict[str, Any] | None = None, message: str | None = None) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow=workflow or {},
        sync=sync or {},
        safeguarding_record=item,
    )


def _update_status(conn, record_id: int, status: str, current_user: dict[str, Any], note: str | None = None) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE safeguarding_records
            SET status = %s,
                workflow_status = %s,
                archived = CASE WHEN %s = 'archived' THEN TRUE ELSE archived END,
                manager_review_comment = COALESCE(%s, manager_review_comment),
                approved_by = CASE WHEN %s = 'approved' THEN %s ELSE approved_by END,
                reviewed_at = CASE WHEN %s IN ('approved', 'returned') THEN NOW() ELSE reviewed_at END,
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (status, status, status, note, status, _actor_id(current_user), status, record_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Safeguarding record not found")
    conn.commit()
    return _shape(dict(row))


@router.get("/{young_person_id}/safeguarding")
def list_safeguarding_records(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _ensure_schema(conn)
    _assert_home_access(conn, young_person_id, current_user)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM safeguarding_records
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY updated_at DESC, created_at DESC, id DESC
            """,
            (young_person_id,),
        )
        rows = [_shape(dict(row)) for row in (cur.fetchall() or [])]
    return {"ok": True, "items": rows, "safeguarding_records": rows, "count": len(rows)}


@router.get("/{young_person_id}/safeguarding/archive")
def list_archived_safeguarding_records(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _ensure_schema(conn)
    _assert_home_access(conn, young_person_id, current_user)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM safeguarding_records
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = TRUE
            ORDER BY updated_at DESC, created_at DESC, id DESC
            """,
            (young_person_id,),
        )
        rows = [_shape(dict(row)) for row in (cur.fetchall() or [])]
    return {"ok": True, "items": rows, "safeguarding_records": rows, "count": len(rows)}


@router.post("/{young_person_id}/safeguarding")
def create_safeguarding_record(young_person_id: int, payload: dict[str, Any] = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_can_edit(current_user)
    _ensure_schema(conn)
    scope = _assert_home_access(conn, young_person_id, current_user)
    data = dict(payload or {})
    status = data.get("status") if data.get("status") in SAFE_STATUSES else "draft"
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO safeguarding_records (
                young_person_id, home_id, title, category, severity, concern_summary,
                narrative, child_voice, actions_taken, status, workflow_status,
                created_by, archived, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE, NOW(), NOW()
            ) RETURNING *
            """,
            (
                young_person_id,
                scope.get("home_id"),
                data.get("title") or "Safeguarding record",
                data.get("category") or "safeguarding",
                data.get("severity") or "high",
                data.get("concern_summary") or data.get("summary"),
                data.get("narrative") or data.get("description"),
                data.get("child_voice"),
                data.get("actions_taken"),
                status,
                data.get("workflow_status") or status,
                _actor_id(current_user),
            ),
        )
        row = cur.fetchone()
    conn.commit()
    item = _shape(dict(row))
    workflow = _link(conn, item=item, event_type="created", current_user=current_user)
    sync = _sync(item)
    return _response(item=item, workflow=workflow, sync=sync, message="Safeguarding record created")


@router.get("/safeguarding/{record_id}")
def get_safeguarding_record(record_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    item = _load_record(conn, record_id, current_user)
    return _response(item=item, message="Safeguarding record loaded")


@router.patch("/safeguarding/{record_id}")
@router.put("/safeguarding/{record_id}")
def update_safeguarding_record(record_id: int, payload: dict[str, Any] = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_can_edit(current_user)
    _load_record(conn, record_id, current_user)
    data = dict(payload or {})
    allowed = ["title", "category", "severity", "concern_summary", "narrative", "child_voice", "actions_taken", "status", "workflow_status", "manager_review_comment", "archived"]
    updates = {key: data[key] for key in allowed if key in data}
    if not updates:
        raise HTTPException(status_code=400, detail="No supported changes provided")
    if "status" in updates and updates["status"] not in SAFE_STATUSES:
        updates["status"] = "draft"
    set_parts = []
    values = []
    for key, value in updates.items():
        set_parts.append(f"{key} = %s")
        values.append(value)
    if "workflow_status" not in updates and "status" in updates:
        set_parts.append("workflow_status = %s")
        values.append(updates["status"])
    set_parts.append("updated_at = NOW()")
    values.append(record_id)
    with conn.cursor() as cur:
        cur.execute(f"UPDATE safeguarding_records SET {', '.join(set_parts)} WHERE id = %s RETURNING *", values)
        row = cur.fetchone()
    conn.commit()
    item = _shape(dict(row))
    workflow = _link(conn, item=item, event_type="updated", current_user=current_user)
    sync = _sync(item)
    return _response(item=item, workflow=workflow, sync=sync, message="Safeguarding record updated")


@router.post("/safeguarding/{record_id}/submit")
@router.put("/safeguarding/{record_id}/submit")
def submit_safeguarding_record(record_id: int, payload: dict[str, Any] | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_can_edit(current_user)
    _load_record(conn, record_id, current_user)
    item = _update_status(conn, record_id, "submitted", current_user, (payload or {}).get("review_note") if payload else None)
    workflow = _link(conn, item=item, event_type="submitted", current_user=current_user)
    sync = _sync(item)
    return _response(item=item, workflow=workflow, sync=sync, message="Safeguarding record submitted")


@router.post("/safeguarding/{record_id}/approve")
@router.put("/safeguarding/{record_id}/approve")
def approve_safeguarding_record(record_id: int, payload: dict[str, Any] | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_can_review(current_user)
    _load_record(conn, record_id, current_user)
    item = _update_status(conn, record_id, "approved", current_user, (payload or {}).get("review_note") if payload else None)
    workflow = _link(conn, item=item, event_type="approved", current_user=current_user)
    sync = _sync(item)
    return _response(item=item, workflow=workflow, sync=sync, message="Safeguarding record approved")


@router.post("/safeguarding/{record_id}/return")
@router.put("/safeguarding/{record_id}/return")
def return_safeguarding_record(record_id: int, payload: dict[str, Any] | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_can_review(current_user)
    _load_record(conn, record_id, current_user)
    item = _update_status(conn, record_id, "returned", current_user, (payload or {}).get("review_note") if payload else None)
    workflow = _link(conn, item=item, event_type="returned", current_user=current_user)
    sync = _sync(item)
    return _response(item=item, workflow=workflow, sync=sync, message="Safeguarding record returned")


@router.post("/safeguarding/{record_id}/archive")
@router.put("/safeguarding/{record_id}/archive")
def archive_safeguarding_record(record_id: int, payload: dict[str, Any] | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_can_review(current_user)
    _load_record(conn, record_id, current_user)
    item = _update_status(conn, record_id, "archived", current_user, (payload or {}).get("review_note") if payload else None)
    workflow = _link(conn, item=item, event_type="archived", current_user=current_user)
    sync = _sync(item)
    return _response(item=item, workflow=workflow, sync=sync, message="Safeguarding record archived")
