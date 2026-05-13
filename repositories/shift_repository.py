from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import (
    current_allowed_home_ids,
    current_home_id,
    current_provider_id,
    current_role,
    current_user_id,
    is_admin,
    is_manager,
    safe_int,
    table_exists,
)


class OperationalSchemaUnavailable(RuntimeError):
    """Raised when an operational table/migration has not been applied."""

    def __init__(self, feature: str, table_name: str) -> None:
        super().__init__(f"{feature} requires migration/table {table_name}")
        self.feature = feature
        self.table_name = table_name


SHIFT_LIFECYCLE = [
    "start_shift",
    "join_shift",
    "handover_received",
    "shift_active",
    "welfare_checks",
    "recording_completed",
    "handover_prepared",
    "shift_signed_off",
]

RECORD_TYPE_MAP = {
    "quick_daily_note": "daily_record",
    "quick_chronology_entry": "observation",
    "quick_incident": "incident_note",
    "quick_safeguarding_concern": "concern",
    "quick_keywork_note": "key_work_session",
    "quick_room_check": "observation",
    "quick_welfare_check": "observation",
    "quick_medication_admin_note": "health_note",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalise_priority(value: Any) -> str:
    priority = str(value or "medium").strip().lower()
    if priority in {"critical", "urgent"}:
        return "critical"
    if priority in {"high", "medium", "low"}:
        return priority
    return "medium"


def _priority_score(priority: str, due_at: Any = None, safeguarding: bool = False) -> int:
    base = {"critical": 100, "high": 80, "medium": 55, "low": 30}.get(_normalise_priority(priority), 55)
    if safeguarding:
        base = max(base, 85)
    if due_at:
        try:
            due = due_at if isinstance(due_at, datetime) else datetime.fromisoformat(str(due_at).replace("Z", "+00:00"))
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if due < datetime.now(timezone.utc):
                base = min(100, base + 10)
        except Exception:
            pass
    return base


def _normalise_status(value: Any) -> str:
    status = str(value or "open").strip().lower().replace(" ", "_")
    if status in {"complete", "done", "closed", "resolved", "approved", "signed_off"}:
        return "completed"
    if status in {"review", "manager_review", "awaiting_review"}:
        return "awaiting_review"
    if status in {"late"}:
        return "overdue"
    return status or "open"


def _home_scope(current_user: dict[str, Any], requested_home_id: int | None = None) -> tuple[str, list[Any]]:
    if requested_home_id is not None:
        allowed = current_allowed_home_ids(current_user)
        if not is_admin(current_user) and allowed and requested_home_id not in allowed:
            raise HTTPException(status_code=403, detail="Access denied for this home")
        return "home_id = %s", [requested_home_id]

    allowed = current_allowed_home_ids(current_user)
    if is_admin(current_user):
        return "1 = 1", []
    if len(allowed) == 1:
        return "home_id = %s", [allowed[0]]
    if allowed:
        return "home_id = ANY(%s)", [allowed]
    home_id = current_home_id(current_user)
    if home_id is not None:
        return "home_id = %s", [home_id]
    return "1 = 0", []


def _row_dict(row: Any) -> dict[str, Any]:
    return dict(row or {})


def _rows(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


class ShiftRepository:
    """Operational shift, staff workflow and quick-record persistence helpers."""

    def require_table(self, conn: Any, feature: str, table_name: str) -> None:
        if not table_exists(conn, table_name):
            raise OperationalSchemaUnavailable(feature, table_name)

    def list_shifts(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None, limit: int = 20) -> list[dict[str, Any]]:
        self.require_table(conn, "shift operations", "os_shift_sessions")
        where, params = _home_scope(current_user, home_id)
        safe_limit = max(1, min(int(limit or 20), 100))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if table_exists(conn, "vw_os_shift_leader_board"):
                cur.execute(
                    f"""
                    SELECT *
                    FROM public.vw_os_shift_leader_board
                    WHERE {where}
                    ORDER BY
                      CASE shift_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
                      started_at DESC NULLS LAST,
                      shift_date DESC
                    LIMIT %s
                    """,
                    (*params, safe_limit),
                )
            else:
                cur.execute(
                    f"""
                    SELECT
                      id AS shift_session_id,
                      provider_id,
                      home_id,
                      shift_date,
                      shift_type,
                      status::text AS shift_status,
                      shift_lead_user_id,
                      shift_lead_staff_id,
                      started_at,
                      ended_at,
                      0::int AS open_tasks,
                      0::int AS critical_tasks,
                      0::int AS high_tasks,
                      0::int AS overdue_tasks,
                      0::int AS handover_items,
                      0::int AS follow_up_items,
                      CASE WHEN status::text IN ('active','handover') THEN 'active' ELSE 'stable' END AS shift_state
                    FROM public.os_shift_sessions
                    WHERE {where}
                    ORDER BY started_at DESC NULLS LAST, shift_date DESC
                    LIMIT %s
                    """,
                    (*params, safe_limit),
                )
            return _rows(cur.fetchall())

    def current_shift(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any] | None:
        self.require_table(conn, "current shift", "os_shift_sessions")
        where, params = _home_scope(current_user, home_id)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT *
                FROM public.os_shift_sessions
                WHERE {where}
                  AND status::text IN ('active','handover','planned')
                ORDER BY
                  CASE status::text WHEN 'active' THEN 0 WHEN 'handover' THEN 1 ELSE 2 END,
                  started_at DESC NULLS LAST,
                  created_at DESC
                LIMIT 1
                """,
                tuple(params),
            )
            return _row_dict(cur.fetchone()) or None

    def start_shift(self, conn: Any, current_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        self.require_table(conn, "start shift", "os_shift_sessions")
        home_id = safe_int(payload.get("home_id")) or current_home_id(current_user)
        if home_id is None:
            raise HTTPException(status_code=400, detail="home_id is required to start a shift")
        _home_scope(current_user, home_id)
        user_id = current_user_id(current_user)
        provider_id = safe_int(payload.get("provider_id")) or current_provider_id(current_user)
        shift_type = str(payload.get("shift_type") or "day").strip().lower()
        shift_date = payload.get("shift_date")
        metadata = {
            "active_staff": [{"user_id": user_id, "joined_at": _now_iso(), "role": current_role(current_user)}],
            "lifecycle": [{"state": "start_shift", "at": _now_iso(), "by": user_id}],
            "mobile_ready": True,
        }
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO public.os_shift_sessions (
                  provider_id, home_id, shift_date, shift_type, status,
                  shift_lead_user_id, shift_lead_staff_id, started_at, created_by, metadata
                )
                VALUES (%s, %s, COALESCE(%s::date, CURRENT_DATE), %s, 'active', %s, %s, NOW(), %s, %s::jsonb)
                ON CONFLICT (home_id, shift_date, shift_type) DO UPDATE SET
                  status = 'active',
                  shift_lead_user_id = COALESCE(EXCLUDED.shift_lead_user_id, public.os_shift_sessions.shift_lead_user_id),
                  shift_lead_staff_id = COALESCE(EXCLUDED.shift_lead_staff_id, public.os_shift_sessions.shift_lead_staff_id),
                  started_at = COALESCE(public.os_shift_sessions.started_at, NOW()),
                  updated_at = NOW(),
                  metadata = public.os_shift_sessions.metadata || EXCLUDED.metadata
                RETURNING *
                """,
                (
                    provider_id,
                    home_id,
                    shift_date,
                    shift_type,
                    user_id,
                    safe_int(payload.get("shift_lead_staff_id")),
                    user_id,
                    Json(metadata),
                ),
            )
            shift = _row_dict(cur.fetchone())
        return shift

    def join_shift(self, conn: Any, current_user: dict[str, Any], shift_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        return self.record_shift_lifecycle(
            conn,
            current_user,
            shift_id,
            {"state": "join_shift", "note": payload.get("note"), "staff_id": payload.get("staff_id")},
        )

    def record_shift_lifecycle(self, conn: Any, current_user: dict[str, Any], shift_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.require_table(conn, "shift lifecycle", "os_shift_sessions")
        state = str(payload.get("state") or "").strip().lower()
        if state not in SHIFT_LIFECYCLE:
            raise HTTPException(status_code=400, detail=f"state must be one of: {', '.join(SHIFT_LIFECYCLE)}")
        user_id = current_user_id(current_user)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM public.os_shift_sessions WHERE id = %s", (shift_id,))
            existing = _row_dict(cur.fetchone())
            if not existing:
                raise HTTPException(status_code=404, detail="Shift not found")
            _home_scope(current_user, safe_int(existing.get("home_id")))
            event = {
                "state": state,
                "at": _now_iso(),
                "by": user_id,
                "note": payload.get("note"),
                "staff_id": safe_int(payload.get("staff_id")),
            }
            status = "handover" if state == "handover_prepared" else "completed" if state == "shift_signed_off" else existing.get("status")
            ended_at_expr = "NOW()" if state == "shift_signed_off" else "ended_at"
            cur.execute(
                f"""
                UPDATE public.os_shift_sessions
                SET status = %s,
                    ended_at = {ended_at_expr},
                    handover_summary = COALESCE(%s, handover_summary),
                    safety_summary = COALESCE(%s, safety_summary),
                    updated_at = NOW(),
                    metadata = jsonb_set(
                      COALESCE(metadata, '{{}}'::jsonb),
                      '{{lifecycle}}',
                      COALESCE(metadata->'lifecycle', '[]'::jsonb) || %s::jsonb
                    )
                WHERE id = %s
                RETURNING *
                """,
                (status, payload.get("handover_summary"), payload.get("safety_summary"), Json([event]), shift_id),
            )
            return _row_dict(cur.fetchone())

    def list_shift_tasks(self, conn: Any, current_user: dict[str, Any], *, shift_id: str | None = None, home_id: int | None = None, staff_id: int | None = None) -> list[dict[str, Any]]:
        if not table_exists(conn, "os_shift_tasks"):
            return []
        where, params = _home_scope(current_user, home_id)
        filters = [where]
        if shift_id:
            filters.append("shift_session_id = %s")
            params.append(shift_id)
        if staff_id is not None:
            filters.append("(assigned_to_staff_id = %s OR staff_id = %s OR assigned_to_user_id = %s)")
            params.extend([staff_id, staff_id, staff_id])
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                  id::text,
                  provider_id,
                  home_id,
                  shift_session_id::text,
                  young_person_id,
                  staff_id,
                  title,
                  summary,
                  priority::text,
                  status,
                  due_at,
                  assigned_to_user_id,
                  assigned_to_staff_id,
                  completed_at,
                  created_at,
                  metadata
                FROM public.os_shift_tasks
                WHERE {" AND ".join(filters)}
                  AND COALESCE(status, 'open') NOT IN ('completed','dismissed')
                ORDER BY
                  CASE priority::text WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                  due_at ASC NULLS LAST,
                  created_at DESC
                LIMIT 80
                """,
                tuple(params),
            )
            rows = _rows(cur.fetchall())
        for row in rows:
            row["priority_score"] = _priority_score(row.get("priority"), row.get("due_at"))
            row["href"] = f"/shifts/current?task={row.get('id')}"
        return rows

    def list_tasks_queue(self, conn: Any, current_user: dict[str, Any], *, staff_id: int | None = None, home_id: int | None = None, limit: int = 40) -> list[dict[str, Any]]:
        if not table_exists(conn, "tasks"):
            return []
        where, params = _home_scope(current_user, home_id)
        filters = [where, "COALESCE(status, CASE WHEN completed THEN 'completed' ELSE 'pending' END) NOT IN ('completed','done','closed')"]
        if staff_id is not None:
            filters.append("assigned_to = %s")
            params.append(staff_id)
        safe_limit = max(1, min(int(limit or 40), 100))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                  id::text,
                  title,
                  COALESCE(status, CASE WHEN completed THEN 'completed' ELSE 'pending' END) AS status,
                  priority,
                  source,
                  home_id,
                  young_person_id,
                  assigned_to,
                  due_at,
                  created_at,
                  CASE WHEN due_at IS NOT NULL AND due_at < NOW() THEN true ELSE false END AS is_overdue
                FROM public.tasks
                WHERE {" AND ".join(filters)}
                ORDER BY
                  CASE COALESCE(priority, 'normal') WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                  due_at ASC NULLS LAST,
                  created_at DESC
                LIMIT %s
                """,
                (*params, safe_limit),
            )
            rows = _rows(cur.fetchall())
        for row in rows:
            row["queue"] = "recording_overdue" if row.get("is_overdue") else "operational_task"
            row["priority_score"] = _priority_score(row.get("priority"), row.get("due_at"))
            row["href"] = f"/actions?task={row.get('id')}"
        return rows

    def list_handover_items(self, conn: Any, current_user: dict[str, Any], *, shift_id: str | None = None, home_id: int | None = None, limit: int = 80) -> list[dict[str, Any]]:
        if not table_exists(conn, "os_shift_handover_items"):
            return []
        where, params = _home_scope(current_user, home_id)
        filters = [where]
        if shift_id:
            filters.append("shift_session_id = %s")
            params.append(shift_id)
        safe_limit = max(1, min(int(limit or 80), 150))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                  id::text,
                  provider_id,
                  home_id,
                  shift_session_id::text,
                  young_person_id,
                  item_type,
                  title,
                  details,
                  priority::text,
                  requires_follow_up,
                  created_by,
                  created_at,
                  metadata
                FROM public.os_shift_handover_items
                WHERE {" AND ".join(filters)}
                ORDER BY
                  CASE priority::text WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                  created_at DESC
                LIMIT %s
                """,
                (*params, safe_limit),
            )
            return _rows(cur.fetchall())

    def create_handover_item(self, conn: Any, current_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        self.require_table(conn, "handover preparation", "os_shift_handover_items")
        shift_id = str(payload.get("shift_session_id") or payload.get("shift_id") or "")
        home_id = safe_int(payload.get("home_id")) or current_home_id(current_user)
        if not shift_id and table_exists(conn, "os_shift_sessions"):
            current = self.current_shift(conn, current_user, home_id=home_id)
            shift_id = str((current or {}).get("id") or "")
        if not shift_id:
            raise HTTPException(status_code=400, detail="A current shift is required before preparing handover")
        if home_id is None:
            raise HTTPException(status_code=400, detail="home_id is required")
        _home_scope(current_user, home_id)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO public.os_shift_handover_items (
                  provider_id, home_id, shift_session_id, young_person_id, item_type, title, details,
                  priority, requires_follow_up, created_by, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, false), %s, %s::jsonb)
                RETURNING *
                """,
                (
                    current_provider_id(current_user),
                    home_id,
                    shift_id,
                    safe_int(payload.get("young_person_id")),
                    payload.get("item_type") or "general",
                    payload.get("title") or "Handover item",
                    payload.get("details") or payload.get("summary"),
                    _normalise_priority(payload.get("priority")),
                    payload.get("requires_follow_up"),
                    current_user_id(current_user),
                    Json({"linked_records": payload.get("linked_records") or [], "workflow_state": "handover_prepared"}),
                ),
            )
            return _row_dict(cur.fetchone())

    def assigned_children(self, conn: Any, current_user: dict[str, Any], *, staff_id: int | None = None, home_id: int | None = None) -> list[dict[str, Any]]:
        if not table_exists(conn, "young_people"):
            return []
        where, params = _home_scope(current_user, home_id)
        filters = [where]
        if staff_id is not None:
            filters.append("(allocated_key_worker_id = %s OR key_worker_id = %s OR staff_id = %s)")
            params.extend([staff_id, staff_id, staff_id])
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute(
                    f"""
                    SELECT id, first_name, last_name, preferred_name, status, home_id, risk_level, safeguarding_status
                    FROM public.young_people
                    WHERE {" AND ".join(filters)}
                      AND COALESCE(status, 'active') NOT IN ('closed','archived')
                    ORDER BY
                      CASE COALESCE(risk_level, 'medium') WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                      preferred_name NULLS LAST,
                      first_name NULLS LAST
                    LIMIT 80
                    """,
                    tuple(params),
                )
            except Exception:
                conn.rollback()
                cur.execute(
                    f"""
                    SELECT id, first_name, last_name, status, home_id
                    FROM public.young_people
                    WHERE {where}
                      AND COALESCE(status, 'active') NOT IN ('closed','archived')
                    ORDER BY first_name NULLS LAST, last_name NULLS LAST
                    LIMIT 80
                    """,
                    tuple(params[: len(_home_scope(current_user, home_id)[1])]),
                )
            return _rows(cur.fetchall())

    def active_incidents(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None, limit: int = 20) -> list[dict[str, Any]]:
        if not table_exists(conn, "incidents"):
            return []
        where, params = _home_scope(current_user, home_id)
        safe_limit = max(1, min(int(limit or 20), 50))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            try:
                cur.execute(
                    f"""
                    SELECT id::text, home_id, young_person_id, incident_datetime, date_time, type, category,
                           severity, status, description, manager_review, safeguarding_required, updated_at
                    FROM public.incidents
                    WHERE {where}
                      AND COALESCE(status, 'active') NOT IN ('closed','completed','resolved')
                    ORDER BY
                      CASE COALESCE(severity, 'medium') WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                      COALESCE(incident_datetime, date_time, updated_at, created_at) DESC NULLS LAST
                    LIMIT %s
                    """,
                    (*params, safe_limit),
                )
            except Exception:
                conn.rollback()
                return []
            rows = _rows(cur.fetchall())
        for row in rows:
            row["priority_score"] = _priority_score(row.get("severity"), safeguarding=bool(row.get("safeguarding_required")))
            row["href"] = f"/incidents/{row.get('id')}"
        return rows

    def care_records_requiring_review(self, conn: Any, current_user: dict[str, Any], *, staff_id: int | None = None, home_id: int | None = None, limit: int = 40) -> list[dict[str, Any]]:
        if not table_exists(conn, "os_young_person_care_records"):
            return []
        where, params = _home_scope(current_user, home_id)
        filters = [where]
        if staff_id is not None:
            filters.append("created_by = %s")
            params.append(staff_id)
        safe_limit = max(1, min(int(limit or 40), 100))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                  id::text,
                  home_id,
                  young_person_id,
                  record_type::text,
                  status::text,
                  title,
                  narrative,
                  occurred_at,
                  created_by,
                  manager_review_required,
                  safeguarding_relevant,
                  inspection_relevant,
                  manager_comment,
                  reviewed_at
                FROM public.os_young_person_care_records
                WHERE {" AND ".join(filters)}
                  AND (
                    manager_review_required = true
                    OR status::text IN ('manager_review','returned','draft')
                    OR safeguarding_relevant = true
                  )
                ORDER BY manager_review_required DESC, occurred_at DESC
                LIMIT %s
                """,
                (*params, safe_limit),
            )
            rows = _rows(cur.fetchall())
        for row in rows:
            row["queue"] = "awaiting_review" if row.get("manager_review_required") else "recording_due"
            row["href"] = f"/chronology/{row.get('id')}"
        return rows

    def quick_record(self, conn: Any, current_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        self.require_table(conn, "rapid recording", "os_young_person_care_records")
        home_id = safe_int(payload.get("home_id")) or current_home_id(current_user)
        young_person_id = safe_int(payload.get("young_person_id"))
        if home_id is None or young_person_id is None:
            raise HTTPException(status_code=400, detail="home_id and young_person_id are required")
        _home_scope(current_user, home_id)
        quick_type = str(payload.get("quick_type") or "quick_daily_note").strip()
        record_type = RECORD_TYPE_MAP.get(quick_type, "observation")
        text = str(payload.get("narrative") or payload.get("note") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="A short note is required")
        title = str(payload.get("title") or quick_type.replace("_", " ").title()).strip()
        safeguarding = quick_type == "quick_safeguarding_concern" or bool(payload.get("safeguarding_relevant"))
        manager_review = safeguarding or quick_type in {"quick_incident", "quick_medication_admin_note"} or bool(payload.get("manager_review_required"))
        tags = [quick_type, "rapid_recording"]
        if payload.get("voice_dictation_placeholder"):
            tags.append("voice_dictation_placeholder")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO public.os_young_person_care_records (
                  provider_id, home_id, young_person_id, record_type, status, title, narrative,
                  child_voice, staff_analysis, actions_taken, follow_up_required, follow_up_summary,
                  mood, presentation, location, safeguarding_relevant, inspection_relevant,
                  tags, manager_review_required, created_by, updated_by, metadata
                )
                VALUES (
                  %s, %s, %s, %s, COALESCE(%s, 'submitted')::os_care_record_status, %s, %s,
                  %s, %s, %s::jsonb, COALESCE(%s, false), %s,
                  %s, %s, %s, %s, true,
                  %s, %s, %s, %s, %s::jsonb
                )
                RETURNING *
                """,
                (
                    current_provider_id(current_user),
                    home_id,
                    young_person_id,
                    record_type,
                    payload.get("status") or "submitted",
                    title,
                    text,
                    payload.get("child_voice"),
                    payload.get("staff_analysis") or payload.get("ai_assisted_draft"),
                    Json(payload.get("actions_taken") or []),
                    payload.get("follow_up_required"),
                    payload.get("follow_up_summary"),
                    payload.get("mood"),
                    payload.get("presentation"),
                    payload.get("location"),
                    safeguarding,
                    tags,
                    manager_review,
                    current_user_id(current_user),
                    current_user_id(current_user),
                    Json(
                        {
                            "quick_type": quick_type,
                            "draft_recovered": bool(payload.get("draft_recovered")),
                            "offline_queue_token": payload.get("offline_queue_token"),
                            "chronology_preview": self.chronology_preview(payload, title, text),
                        }
                    ),
                ),
            )
            record = _row_dict(cur.fetchone())
        return {
            "record": record,
            "chronology_preview": self.chronology_preview(payload, title, text),
            "review_required": manager_review,
            "message": "Rapid record saved. Chronology preview generated; chronology writeback remains explicit to avoid duplicates.",
        }

    def chronology_preview(self, payload: dict[str, Any], title: str, text: str) -> dict[str, Any]:
        return {
            "title": title,
            "summary": text[:280],
            "suggested_event_type": payload.get("quick_type") or "rapid_recording",
            "safeguarding_relevant": bool(payload.get("safeguarding_relevant") or payload.get("quick_type") == "quick_safeguarding_concern"),
            "language_guardrails": ["records indicate", "evidence suggests", "review required"],
        }

    def operational_notifications(self, conn: Any, current_user: dict[str, Any], *, unread_only: bool = False, limit: int = 30) -> list[dict[str, Any]]:
        if not table_exists(conn, "notifications"):
            return []
        user_id = current_user_id(current_user)
        if user_id is None:
            return []
        unread = "AND read_at IS NULL" if unread_only else ""
        safe_limit = max(1, min(int(limit or 30), 100))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT id::text, title, body AS message, notification_type, priority, href, source_ref_type,
                       source_ref_id, home_id, young_person_id, read_at, created_at
                FROM public.notifications
                WHERE user_id = %s
                  AND dismissed_at IS NULL
                  {unread}
                ORDER BY
                  CASE COALESCE(priority, 'normal') WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                  created_at DESC
                LIMIT %s
                """,
                (user_id, safe_limit),
            )
            return _rows(cur.fetchall())

    def acknowledge_notification(self, conn: Any, current_user: dict[str, Any], notification_id: str) -> dict[str, Any]:
        self.require_table(conn, "operational notification acknowledgement", "notifications")
        user_id = current_user_id(current_user)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE public.notifications
                SET read_at = COALESCE(read_at, NOW())
                WHERE id = %s AND user_id = %s AND dismissed_at IS NULL
                RETURNING *
                """,
                (safe_int(notification_id), user_id),
            )
            row = _row_dict(cur.fetchone())
            if not row:
                raise HTTPException(status_code=404, detail="Notification not found")
            return row

    def safeguarding_escalations(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> list[dict[str, Any]]:
        records = []
        for incident in self.active_incidents(conn, current_user, home_id=home_id, limit=30):
            if incident.get("safeguarding_required") or _normalise_priority(incident.get("severity")) in {"critical", "high"}:
                records.append(
                    {
                        "id": f"incident-{incident.get('id')}",
                        "source_type": "incident",
                        "source_id": incident.get("id"),
                        "title": incident.get("type") or incident.get("category") or "Incident requiring safeguarding consideration",
                        "state": "manager_review_required" if incident.get("manager_review") else "safeguarding_consideration",
                        "review_state": "review_required",
                        "priority": _normalise_priority(incident.get("severity")),
                        "timeline": [
                            "Incident",
                            "safeguarding consideration",
                            "manager review",
                            "strategy discussion",
                            "action assignment",
                            "evidence gathering",
                            "chronology update",
                            "oversight sign-off",
                        ],
                        "language_guardrail": "Evidence suggests review is required; no automatic safeguarding conclusion has been made.",
                        "href": incident.get("href"),
                    }
                )
        for record in self.care_records_requiring_review(conn, current_user, home_id=home_id, limit=30):
            if record.get("safeguarding_relevant"):
                records.append(
                    {
                        "id": f"record-{record.get('id')}",
                        "source_type": "care_record",
                        "source_id": record.get("id"),
                        "title": record.get("title") or "Safeguarding relevant record",
                        "state": "review_required",
                        "review_state": "awaiting_manager_review",
                        "priority": "high",
                        "timeline": ["record created", "manager review", "evidence gathering", "chronology update", "oversight sign-off"],
                        "language_guardrail": "Records indicate safeguarding relevance; manager review required.",
                        "href": record.get("href"),
                    }
                )
        return records[:50]

    def qa_items(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for record in self.care_records_requiring_review(conn, current_user, home_id=home_id, limit=60):
            items.append(
                {
                    "id": record.get("id"),
                    "type": "record_review",
                    "title": record.get("title") or "Record requires QA",
                    "status": record.get("status") or "awaiting_review",
                    "priority": "high" if record.get("safeguarding_relevant") else "medium",
                    "young_person_id": record.get("young_person_id"),
                    "href": record.get("href"),
                    "qa_lifecycle": ["review_records", "request_amendment", "assign_follow_up", "sign_off"],
                    "chronology_qa_indicator": "review_required" if record.get("manager_review_required") else "quality_check",
                }
            )
        for incident in self.active_incidents(conn, current_user, home_id=home_id, limit=30):
            items.append(
                {
                    "id": incident.get("id"),
                    "type": "incident_review",
                    "title": incident.get("type") or "Incident awaiting review",
                    "status": incident.get("status") or "active",
                    "priority": _normalise_priority(incident.get("severity")),
                    "young_person_id": incident.get("young_person_id"),
                    "href": incident.get("href"),
                    "qa_lifecycle": ["manager_review", "actions_assigned", "evidence_sufficiency", "sign_off"],
                    "chronology_qa_indicator": "safeguarding_review" if incident.get("safeguarding_required") else "follow_up_check",
                }
            )
        return items[:80]

    def review_qa_item(self, conn: Any, current_user: dict[str, Any], item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not is_manager(current_user):
            raise HTTPException(status_code=403, detail="Manager role required for QA sign-off")
        action = str(payload.get("action") or "comment").strip().lower()
        if table_exists(conn, "os_young_person_care_records"):
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM public.os_young_person_care_records WHERE id = %s", (item_id,))
                existing = _row_dict(cur.fetchone())
                if existing:
                    _home_scope(current_user, safe_int(existing.get("home_id")))
                    status = "approved" if action in {"approve", "sign_off", "sign-off"} else "returned" if action in {"request_amendment", "return"} else existing.get("status")
                    cur.execute(
                        """
                        UPDATE public.os_young_person_care_records
                        SET status = %s::os_care_record_status,
                            reviewed_by = %s,
                            reviewed_at = NOW(),
                            manager_comment = COALESCE(%s, manager_comment),
                            manager_review_required = CASE WHEN %s IN ('approved') THEN false ELSE manager_review_required END,
                            updated_by = %s,
                            updated_at = NOW(),
                            metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb
                        WHERE id = %s
                        RETURNING *
                        """,
                        (
                            status,
                            current_user_id(current_user),
                            payload.get("comment"),
                            status,
                            current_user_id(current_user),
                            Json({"qa_action": action, "follow_up": payload.get("follow_up"), "reviewed_at": _now_iso()}),
                            item_id,
                        ),
                    )
                    return _row_dict(cur.fetchone())
        raise HTTPException(status_code=404, detail="QA item not found")
