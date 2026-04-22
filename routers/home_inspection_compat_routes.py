from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from auth.mfa_guard import SESSION_USER_ID_KEY, is_mfa_verified_in_session
from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.home_inspection_compat")

router = APIRouter(tags=["home_inspection_compat"])
compat_router = APIRouter(tags=["home_inspection_compat_legacy"])


def _dict_row(cursor, row) -> dict[str, Any]:
    if row is None:
        return {}
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


def _dict_rows(cursor, rows) -> list[dict[str, Any]]:
    if not rows:
        return []
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in rows]


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed


def _request_user_id(request: Request) -> int | None:
    try:
        session_user_id = request.session.get(SESSION_USER_ID_KEY)
        if session_user_id is None:
            return None
        session_user_id = int(session_user_id)
    except Exception:
        return None

    try:
        if not is_mfa_verified_in_session(request):
            return None
    except Exception:
        return None

    return session_user_id


def _user_context(request: Request) -> dict[str, Any]:
    user_id = _request_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    u.id,
                    u.role,
                    u.home_id,
                    u.provider_id
                FROM users u
                WHERE u.id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=401, detail="User not found.")

            payload = _dict_row(cur, row)
            payload["role"] = str(payload.get("role") or "staff").strip().lower()
            payload["home_id"] = _safe_int(payload.get("home_id"))
            payload["provider_id"] = _safe_int(payload.get("provider_id"))
            return payload
    finally:
        release_db_connection(conn)


def _user_can_access_home(request: Request, home_id: int) -> dict[str, Any]:
    ctx = _user_context(request)
    role = str(ctx.get("role") or "staff").lower()
    user_home_id = _safe_int(ctx.get("home_id"))
    provider_id = _safe_int(ctx.get("provider_id"))

    if role in {
        "admin",
        "administrator",
        "super_admin",
        "superadmin",
        "ri",
        "responsible_individual",
    }:
        return ctx

    if role in {"manager", "registered_manager", "deputy_manager"}:
        if user_home_id == home_id:
            return ctx
        raise HTTPException(status_code=403, detail="You do not have access to this home.")

    if user_home_id == home_id:
        return ctx

    if provider_id:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT h.id
                    FROM homes h
                    WHERE h.id = %s
                      AND h.provider_id = %s
                    LIMIT 1
                    """,
                    (home_id, provider_id),
                )
                row = cur.fetchone()
                if row:
                    return ctx
        finally:
            release_db_connection(conn)

    raise HTTPException(status_code=403, detail="You do not have access to this home.")


def _table_exists(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        )
        """,
        (table_name,),
    )
    row = cur.fetchone()
    return bool(row and row[0])


def _column_exists(cur, table_name: str, column_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
        )
        """,
        (table_name, column_name),
    )
    row = cur.fetchone()
    return bool(row and row[0])


def _fetch_rows_if_possible(
    cur,
    table_name: str,
    home_id: int,
    *,
    limit: int = 100,
) -> list[dict[str, Any]]:
    if not _table_exists(cur, table_name):
        return []

    has_home_id = _column_exists(cur, table_name, "home_id")
    has_updated_at = _column_exists(cur, table_name, "updated_at")
    has_created_at = _column_exists(cur, table_name, "created_at")

    safe_order = []
    if has_updated_at:
        safe_order.append("updated_at DESC NULLS LAST")
    if has_created_at:
        safe_order.append("created_at DESC NULLS LAST")
    if not safe_order:
        safe_order.append("id DESC")

    final_order = ", ".join(safe_order)

    if has_home_id:
        sql = f"SELECT * FROM {table_name} WHERE home_id = %s ORDER BY {final_order} LIMIT %s"
        cur.execute(sql, (home_id, limit))
    else:
        sql = f"SELECT * FROM {table_name} ORDER BY {final_order} LIMIT %s"
        cur.execute(sql, (limit,))

    return _dict_rows(cur, cur.fetchall())


def _normalise_status(value: Any, default: str = "recorded") -> str:
    text = str(value or "").strip()
    return text or default


def _normalise_title(row: dict[str, Any], *keys: str, default: str = "Record") -> str:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return default


def _normalise_summary(
    row: dict[str, Any],
    *keys: str,
    default: str = "Record available.",
) -> str:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return default


def _sort_key_date(row: dict[str, Any]) -> str:
    return str(
        row.get("due_date")
        or row.get("task_due_date")
        or row.get("action_due_date")
        or row.get("visit_date")
        or row.get("audit_date")
        or row.get("review_period_end")
        or row.get("period_end")
        or row.get("created_at")
        or row.get("updated_at")
        or "9999-12-31"
    )


def _status_is_closed(value: Any) -> bool:
    token = str(value or "").strip().lower()
    return token in {"closed", "completed", "resolved", "cancelled", "done"}


def _dashboard_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            home_rows = _fetch_rows_if_possible(cur, "homes", home_id, limit=1)
            home = home_rows[0] if home_rows else {"id": home_id, "name": f"Home {home_id}"}

            young_people = _fetch_rows_if_possible(cur, "young_people", home_id, limit=100)
            tasks = _fetch_rows_if_possible(cur, "tasks", home_id, limit=100)
            incidents = _fetch_rows_if_possible(cur, "incidents", home_id, limit=100)
            documents = _fetch_rows_if_possible(cur, "documents", home_id, limit=100)
            communications = _fetch_rows_if_possible(cur, "communications", home_id, limit=100)

            return {
                "ok": True,
                "home": home,
                "young_people": young_people,
                "tasks": tasks,
                "incidents": incidents,
                "documents": documents,
                "communications": communications,
                "items": tasks[:20] + incidents[:20] + documents[:20],
                "summary": {
                    "young_people_count": len(young_people),
                    "task_count": len(tasks),
                    "incident_count": len(incidents),
                    "document_count": len(documents),
                },
            }
    finally:
        release_db_connection(conn)


def _team_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            rows = _fetch_rows_if_possible(cur, "staff", home_id, limit=200)
            if not rows:
                rows = _fetch_rows_if_possible(cur, "users", home_id, limit=200)

            items = [
                {
                    **row,
                    "record_type": row.get("record_type") or "workforce",
                    "title": _normalise_title(row, "full_name", "name", "email", default="Staff member"),
                    "staff_member": _normalise_title(row, "full_name", "name", "email", default="Staff member"),
                    "role": row.get("role") or row.get("job_title") or "",
                    "status": _normalise_status(row.get("status"), "active"),
                    "summary": _normalise_summary(
                        row,
                        "notes",
                        "role",
                        default="Workforce record available.",
                    ),
                }
                for row in rows
            ]

            return {
                "ok": True,
                "items": items,
                "team": items,
                "staff": items,
                "summary": {
                    "count": len(items),
                },
            }
    finally:
        release_db_connection(conn)


def _generic_home_table_payload(
    home_id: int,
    request: Request,
    table_name: str,
    record_type: str,
    *,
    aliases: list[str] | None = None,
    title_keys: list[str] | None = None,
    summary_keys: list[str] | None = None,
    status_key: str = "status",
) -> dict[str, Any]:
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            rows = _fetch_rows_if_possible(cur, table_name, home_id, limit=200)

            items = []
            for row in rows:
                item = {
                    **row,
                    "record_type": row.get("record_type") or record_type,
                    "title": _normalise_title(
                        row,
                        *(title_keys or ["title", "name"]),
                        default=record_type.replace("_", " ").title(),
                    ),
                    "status": _normalise_status(row.get(status_key), "recorded"),
                    "summary": _normalise_summary(
                        row,
                        *(summary_keys or ["summary", "notes", "description"]),
                        default=f"{record_type.replace('_', ' ').title()} record available.",
                    ),
                }
                items.append(item)

            payload = {
                "ok": True,
                "items": items,
                "summary": {
                    "count": len(items),
                },
            }

            for alias in aliases or []:
                payload[alias] = items

            return payload
    finally:
        release_db_connection(conn)


def _inspection_ui_header_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            home_rows = _fetch_rows_if_possible(cur, "homes", home_id, limit=1)
            home = home_rows[0] if home_rows else {"id": home_id, "name": f"Home {home_id}"}

            incidents = _fetch_rows_if_possible(cur, "incidents", home_id, limit=200)
            quality_actions = _fetch_rows_if_possible(cur, "quality_audit_actions", home_id, limit=200)
            reg44_actions = _fetch_rows_if_possible(cur, "reg44_actions", home_id, limit=200)
            reg45_actions = _fetch_rows_if_possible(cur, "reg45_actions", home_id, limit=200)
            inspection_actions = _fetch_rows_if_possible(cur, "inspection_improvement_actions", home_id, limit=200)

            all_actions = quality_actions + reg44_actions + reg45_actions + inspection_actions
            open_actions = [row for row in all_actions if not _status_is_closed(row.get("status"))]
            overdue_actions = [
                row
                for row in open_actions
                if str(row.get("status") or "").strip().lower() in {"overdue", "escalated"}
            ]
            critical_actions = [
                row
                for row in open_actions
                if str(row.get("priority") or "").strip().lower() in {"critical", "high"}
            ]

            incident_pressure = len(incidents)
            open_action_count = len(open_actions)
            overdue_count = len(overdue_actions)
            critical_count = len(critical_actions)

            confidence_score = max(
                40.0,
                min(
                    96.0,
                    90.0 - open_action_count * 3.5 - min(incident_pressure, 10) * 1.8,
                ),
            )

            experiences_score = max(55.0, min(92.0, 78.0 - min(open_action_count, 5) * 0.8))
            helped_score = max(45.0, min(90.0, 82.0 - min(incident_pressure, 12) * 1.7 - overdue_count * 1.2))
            leadership_score = max(42.0, min(91.0, 84.0 - open_action_count * 1.8 - critical_count * 2.0))

            def band(score: float) -> str:
                if score >= 85:
                    return "outstanding"
                if score >= 70:
                    return "good"
                if score >= 55:
                    return "requires_improvement"
                return "inadequate"

            experiences_band = band(experiences_score)
            helped_band = band(helped_score)
            leadership_band = band(leadership_score)

            lowest = min(experiences_score, helped_score, leadership_score)
            overall_score = round((experiences_score + helped_score + leadership_score) / 3, 1)
            overall_band = band(lowest if band(lowest) in {"requires_improvement", "inadequate"} else overall_score)

            top_concerns = (
                "Open actions and inspection follow-through need closer grip."
                if open_action_count
                else "No major inspection concerns are currently surfacing."
            )

            item = {
                "home_id": home_id,
                "home_name": home.get("name") or home.get("home_name") or f"Home {home_id}",
                "overall_band": overall_band,
                "overall_score": round(overall_score, 1),
                "confidence_score": round(confidence_score, 1),
                "data_completeness_score": round(max(45.0, min(96.0, 74.0 + open_action_count * 0.2)), 1),
                "evidence_freshness_score": round(max(40.0, min(95.0, 76.0 - overdue_count * 2.5)), 1),
                "limiting_judgement_triggered": overall_band == "inadequate",
                "limiting_reason": "Inspection pressures are likely to limit the overall judgement."
                if overall_band == "inadequate"
                else "",
                "experiences_band": experiences_band,
                "experiences_score": round(experiences_score, 1),
                "helped_band": helped_band,
                "helped_score": round(helped_score, 1),
                "leadership_band": leadership_band,
                "leadership_score": round(leadership_score, 1),
                "open_actions": open_action_count,
                "overdue_actions": overdue_count,
                "critical_actions": critical_count,
                "open_lines_of_enquiry": max(1, min(6, overdue_count + critical_count)) if open_action_count else 0,
                "top_actions_summary": f"{open_action_count} open actions, {overdue_count} overdue, {critical_count} high priority.",
                "top_concerns": top_concerns,
                "narrative_summary": (
                    "The home shows a broadly stable picture, with most pressure sitting in action follow-through and evidence freshness."
                ),
                "strengths_summary": (
                    "Core care routines and general leadership grip are visible."
                ),
                "concerns_summary": (
                    "Outstanding action closure and consistency of oversight remain the main pressure points."
                ),
                "scored_at": home.get("updated_at") or home.get("created_at"),
                "next_action_due_date": min(
                    [row.get("due_date") for row in open_actions if row.get("due_date")] or [None]
                ),
            }

            return {
                "ok": True,
                "items": [item],
                "rows": [item],
                "summary": item,
                "dashboard": item,
            }
    finally:
        release_db_connection(conn)


def _inspection_ui_home_cards_payload(request: Request) -> dict[str, Any]:
    ctx = _user_context(request)
    role = str(ctx.get("role") or "staff").lower()
    home_id = _safe_int(ctx.get("home_id"))
    provider_id = _safe_int(ctx.get("provider_id"))

    home_ids: list[int] = []

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            if role in {
                "admin",
                "administrator",
                "super_admin",
                "superadmin",
                "ri",
                "responsible_individual",
            } and provider_id:
                cur.execute(
                    """
                    SELECT id
                    FROM homes
                    WHERE provider_id = %s
                    ORDER BY id ASC
                    """,
                    (provider_id,),
                )
                home_ids = [int(row[0]) for row in cur.fetchall() if row and row[0] is not None]
            elif home_id:
                home_ids = [home_id]
    finally:
        release_db_connection(conn)

    if not home_ids and home_id:
        home_ids = [home_id]

    items = []
    for target_home_id in home_ids[:20]:
        header = _inspection_ui_header_payload(target_home_id, request)
        if header.get("items"):
            items.append(header["items"][0])

    return {
        "ok": True,
        "items": items,
        "rows": items,
        "cards": items,
    }


def _inspection_ui_sections_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)
    header_payload = _inspection_ui_header_payload(home_id, request)
    header = header_payload.get("summary") or {}

    items = [
        {
            "id": f"{home_id}-experiences",
            "home_id": home_id,
            "record_type": "inspection_section_panel",
            "section_code": "experiences",
            "section_name": "Experiences and progress",
            "score_band": header.get("experiences_band") or "good",
            "score_value": header.get("experiences_score") or 72.0,
            "summary_text": "Day-to-day experiences appear broadly positive and settled.",
            "strengths_text": "Routine care, engagement and progress evidence are generally visible.",
            "concerns_text": "Some stronger evidence of impact would improve confidence.",
        },
        {
            "id": f"{home_id}-helped",
            "home_id": home_id,
            "record_type": "inspection_section_panel",
            "section_code": "helped",
            "section_name": "Help and protection",
            "score_band": header.get("helped_band") or "good",
            "score_value": header.get("helped_score") or 70.0,
            "summary_text": "Safeguarding responses are visible but follow-through must stay tight.",
            "strengths_text": "General response to incidents and safeguarding is evident.",
            "concerns_text": "Chronology, return interviews and action closure need continued grip.",
        },
        {
            "id": f"{home_id}-leadership",
            "home_id": home_id,
            "record_type": "inspection_section_panel",
            "section_code": "leadership",
            "section_name": "Leadership and management",
            "score_band": header.get("leadership_band") or "good",
            "score_value": header.get("leadership_score") or 73.0,
            "summary_text": "Leadership oversight is visible, though not always consistently evidenced.",
            "strengths_text": "Managers appear sighted on priorities and quality themes.",
            "concerns_text": "Evidence of closure and sustained management impact can be stronger.",
        },
    ]

    return {
        "ok": True,
        "items": items,
        "rows": items,
        "inspection_sections": items,
        "inspection_section_panels": items,
    }


def _inspection_ui_reasons_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)
    header_payload = _inspection_ui_header_payload(home_id, request)
    header = header_payload.get("summary") or {}

    helped_band = str(header.get("helped_band") or "good").lower()
    leadership_band = str(header.get("leadership_band") or "good").lower()

    items = [
        {
            "id": f"{home_id}-reason-1",
            "home_id": home_id,
            "record_type": "inspection_reason",
            "section_code": "helped",
            "section_name": "Help and protection",
            "reason_type": "concern" if helped_band != "good" else "context",
            "priority": 1,
            "title": "Safeguarding follow-through needs consistent closure",
            "description": "Inspection confidence is reduced when follow-up actions and return-interview style evidence remain open.",
            "created_at": None,
        },
        {
            "id": f"{home_id}-reason-2",
            "home_id": home_id,
            "record_type": "inspection_reason",
            "section_code": "leadership",
            "section_name": "Leadership and management",
            "reason_type": "concern" if leadership_band != "good" else "strength",
            "priority": 2,
            "title": "Management oversight is visible but closure evidence is variable",
            "description": "Leaders appear sighted on issues, but consistency of evidenced action closure is the main pressure point.",
            "created_at": None,
        },
        {
            "id": f"{home_id}-reason-3",
            "home_id": home_id,
            "record_type": "inspection_reason",
            "section_code": "experiences",
            "section_name": "Experiences and progress",
            "reason_type": "strength",
            "priority": 3,
            "title": "Children’s day-to-day experiences appear more settled",
            "description": "Care routines and progress-related evidence are helping the overall picture.",
            "created_at": None,
        },
    ]

    return {
        "ok": True,
        "items": items,
        "rows": items,
        "inspection_reasons": items,
        "reasons": items,
    }


def _inspection_ui_actions_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            rows: list[dict[str, Any]] = []
            rows.extend(_fetch_rows_if_possible(cur, "inspection_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "inspection_improvement_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "quality_audit_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "reg44_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "reg45_actions", home_id, limit=100))

            items = []
            for row in rows:
                status = _normalise_status(row.get("status"), "open")
                if _status_is_closed(status):
                    continue

                item = {
                    **row,
                    "record_type": "inspection_action",
                    "action_title": _normalise_title(
                        row,
                        "action_title",
                        "title",
                        default="Inspection action",
                    ),
                    "action_description": _normalise_summary(
                        row,
                        "action_description",
                        "summary",
                        "description",
                        "notes",
                        default="Inspection action recorded.",
                    ),
                    "priority": row.get("priority") or "medium",
                    "status": status,
                    "section_code": row.get("section_code") or "",
                    "section_name": row.get("section_name") or row.get("category") or "",
                    "owner_user_name": row.get("owner_user_name") or row.get("assigned_to") or "",
                    "owner_staff_name": row.get("owner_staff_name") or "",
                    "due_date": row.get("due_date"),
                    "recoverable_points_estimate": row.get("recoverable_points_estimate") or 1.0,
                    "projected_section_band": row.get("projected_section_band") or "good",
                }
                items.append(item)

            items.sort(key=lambda x: (_sort_key_date(x), str(x.get("priority") or "")))

            return {
                "ok": True,
                "items": items[:100],
                "rows": items[:100],
                "actions": items[:100],
                "inspection_actions": items[:100],
            }
    finally:
        release_db_connection(conn)


def _inspection_ui_tasks_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            rows = _fetch_rows_if_possible(cur, "tasks", home_id, limit=200)

            items = []
            for row in rows:
                status = _normalise_status(row.get("status"), "open")
                completed = _status_is_closed(status)

                item = {
                    **row,
                    "record_type": "inspection_task",
                    "task_id": row.get("id"),
                    "task_title": _normalise_title(row, "title", "task_title", default="Inspection task"),
                    "action_title": _normalise_summary(
                        row,
                        "summary",
                        "description",
                        "notes",
                        default="Inspection-linked task.",
                    ),
                    "task_due_date": row.get("due_date"),
                    "action_due_date": row.get("due_date"),
                    "assigned_user_name": row.get("owner_name") or row.get("assigned_to") or "",
                    "assigned_role": row.get("owner_role") or "",
                    "completed": completed,
                    "status": status,
                }
                items.append(item)

            items.sort(key=lambda x: (_sort_key_date(x), str(x.get("completed"))))

            return {
                "ok": True,
                "items": items[:100],
                "rows": items[:100],
                "tasks": items[:100],
                "inspection_tasks": items[:100],
            }
    finally:
        release_db_connection(conn)


def _inspection_ui_briefing_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)
    header_payload = _inspection_ui_header_payload(home_id, request)
    header = header_payload.get("summary") or {}

    item = {
        "id": home_id,
        "home_id": home_id,
        "record_type": "inspection_briefing",
        "headline_summary": header.get("narrative_summary")
        or "The home appears broadly stable, with inspection pressure sitting mainly in follow-through and evidence freshness.",
        "overall_position_statement": "The current inspection picture is serviceable, but greater confidence would come from tighter action closure and clearer management narrative.",
        "likely_inspector_focus": header.get("top_concerns")
        or "Likely focus will sit around safeguarding follow-through, evidence freshness and closure discipline.",
        "immediate_priority_actions": "Close overdue actions, refresh stale evidence and ensure management oversight is explicit.",
        "strengths_to_evidence": header.get("strengths_summary") or "Stable routines and core care strengths.",
        "risk_watchpoints": header.get("concerns_summary") or "Action closure and evidence gaps.",
    }

    return {
        "ok": True,
        "items": [item],
        "rows": [item],
        "briefing": item,
        "inspection_briefings": [item],
    }


def _inspection_ui_prep_72h_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)
    header_payload = _inspection_ui_header_payload(home_id, request)
    header = header_payload.get("summary") or {}

    pressure = "heightened" if (header.get("overdue_actions") or 0) > 0 else "steady"
    focus = "Help and protection" if str(header.get("helped_band") or "").lower() != "good" else "Leadership and management"

    item = {
        "id": home_id,
        "home_id": home_id,
        "record_type": "inspection_prep_72_hour",
        "inspection_pressure_level": pressure,
        "primary_focus_area": focus,
        "top_concerns": header.get("top_concerns") or "Action closure and evidence freshness.",
        "urgent_actions": "Review open high-priority actions, refresh evidence and prepare a clear management narrative.",
        "key_evidence_to_pull": "Recent incidents, safeguarding follow-up, audits, leadership commentary and action tracker updates.",
        "likely_questions": "How do leaders know practice is improving, and how quickly are concerns followed through?",
    }

    return {
        "ok": True,
        "items": [item],
        "rows": [item],
        "prep72h": item,
        "inspection_prep_72_hour": [item],
    }


def _inspection_scores_payload(home_id: int, request: Request) -> dict[str, Any]:
    header = _inspection_ui_header_payload(home_id, request)
    item = header.get("summary") or {}

    inspection_score = {
        "id": f"{home_id}-inspection-score",
        "home_id": home_id,
        "record_type": "inspection_score",
        "title": "Inspection readiness",
        "period_start": None,
        "period_end": item.get("scored_at"),
        "overall_band": item.get("overall_band"),
        "overall_score": item.get("overall_score"),
        "confidence_score": item.get("confidence_score"),
        "data_completeness_score": item.get("data_completeness_score"),
        "evidence_freshness_score": item.get("evidence_freshness_score"),
        "limiting_judgement_triggered": item.get("limiting_judgement_triggered"),
        "limiting_reason": item.get("limiting_reason"),
        "narrative_summary": item.get("narrative_summary"),
        "strengths_summary": item.get("strengths_summary"),
        "concerns_summary": item.get("concerns_summary"),
        "created_at": item.get("scored_at"),
        "updated_at": item.get("scored_at"),
    }

    return {
        "ok": True,
        "items": [inspection_score],
        "inspection_scores": [inspection_score],
        "summary": inspection_score,
    }


def _inspection_section_scores_payload(home_id: int, request: Request) -> dict[str, Any]:
    sections_payload = _inspection_ui_sections_payload(home_id, request)
    section_items = []

    for row in sections_payload.get("items", []):
        section_items.append(
            {
                "id": row.get("id"),
                "inspection_score_id": f"{home_id}-inspection-score",
                "record_type": "inspection_section_score",
                "section_code": row.get("section_code"),
                "section_name": row.get("section_name"),
                "score_band": row.get("score_band"),
                "score_value": row.get("score_value"),
                "confidence_score": 70.0,
                "summary_text": row.get("summary_text"),
                "strengths_text": row.get("strengths_text"),
                "concerns_text": row.get("concerns_text"),
                "created_at": None,
                "updated_at": None,
            }
        )

    return {
        "ok": True,
        "items": section_items,
        "inspection_section_scores": section_items,
    }


def _inspection_score_reasons_payload(home_id: int, request: Request) -> dict[str, Any]:
    reasons_payload = _inspection_ui_reasons_payload(home_id, request)
    items = []

    for row in reasons_payload.get("items", []):
        items.append(
            {
                **row,
                "inspection_score_id": f"{home_id}-inspection-score",
                "section_score_id": f"{home_id}-{row.get('section_code')}",
            }
        )

    return {
        "ok": True,
        "items": items,
        "inspection_score_reasons": items,
        "reasons": items,
    }


def _inspection_lines_payload(home_id: int, request: Request) -> dict[str, Any]:
    actions_payload = _inspection_ui_actions_payload(home_id, request)
    items = []

    for idx, action in enumerate(actions_payload.get("items", [])[:12], start=1):
        items.append(
            {
                "id": f"{home_id}-loe-{idx}",
                "home_id": home_id,
                "record_type": "inspection_line_of_enquiry",
                "priority": action.get("priority") or "medium",
                "line_of_enquiry": action.get("action_title") or f"Line of enquiry {idx}",
                "rationale": action.get("action_description") or "Follow-through is required in this area.",
                "status": action.get("status") or "open",
                "due_date": action.get("due_date"),
                "section_code": action.get("section_code") or "",
                "section_name": action.get("section_name") or "",
                "created_at": action.get("created_at"),
                "updated_at": action.get("updated_at"),
            }
        )

    if not items:
        items.append(
            {
                "id": f"{home_id}-loe-1",
                "home_id": home_id,
                "record_type": "inspection_line_of_enquiry",
                "priority": "medium",
                "line_of_enquiry": "How consistently are actions tracked to closure?",
                "rationale": "This remains a common pressure point in inspection readiness.",
                "status": "open",
                "due_date": None,
                "section_code": "leadership",
                "section_name": "Leadership and management",
                "created_at": None,
                "updated_at": None,
            }
        )

    return {
        "ok": True,
        "items": items,
        "inspection_lines_of_enquiry": items,
        "inspection_lines": items,
    }


def _inspection_improvement_actions_payload(home_id: int, request: Request) -> dict[str, Any]:
    return _inspection_ui_actions_payload(home_id, request)


@router.get("/homes/{home_id}/dashboard")
def home_dashboard(home_id: int, request: Request):
    return _dashboard_payload(home_id, request)


@router.get("/homes/{home_id}/team")
def home_team(home_id: int, request: Request):
    return _team_payload(home_id, request)


@router.get("/homes/{home_id}/tasks")
def home_tasks(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "tasks",
        "task",
        aliases=["tasks"],
        title_keys=["title", "task", "task_title"],
        summary_keys=["summary", "description", "notes"],
    )


@router.get("/homes/{home_id}/actions")
def home_actions(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "tasks",
        "task",
        aliases=["actions"],
        title_keys=["title", "task", "task_title"],
        summary_keys=["summary", "description", "notes"],
    )


@router.get("/homes/{home_id}/communications")
def home_communications(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "communications",
        "communication",
        aliases=["communications"],
        title_keys=["title", "subject", "contact_type"],
        summary_keys=["summary", "notes", "description", "outcome"],
    )


@router.get("/homes/{home_id}/therapy")
def home_therapy(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "therapy",
        "therapy",
        aliases=["therapy"],
        title_keys=["title", "therapist_name", "professional_name"],
        summary_keys=["summary", "notes", "recommendations", "outcome"],
    )


@router.get("/homes/{home_id}/training")
def home_training(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "training_records",
        "training",
        aliases=["training"],
        title_keys=["training_name", "title", "name"],
        summary_keys=["summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/supervisions")
def home_supervisions(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "supervisions",
        "supervision",
        aliases=["supervisions"],
        title_keys=["staff_member", "title", "name"],
        summary_keys=["summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/probations")
def home_probations(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "probations",
        "probation",
        aliases=["probations"],
        title_keys=["staff_member", "title", "name"],
        summary_keys=["summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/inductions")
def home_inductions(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "inductions",
        "induction",
        aliases=["inductions"],
        title_keys=["staff_member", "title", "name"],
        summary_keys=["summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/child-compliance")
def home_child_compliance(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "compliance_items",
        "child_compliance",
        aliases=["children", "child_files"],
        title_keys=["young_person_name", "title", "document_type"],
        summary_keys=["summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/documents")
def home_documents(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "documents",
        "document",
        aliases=["documents"],
        title_keys=["title", "document_type", "name"],
        summary_keys=["summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/reports")
def home_reports(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "reports",
        "report",
        aliases=["reports"],
        title_keys=["title", "report_type", "name"],
        summary_keys=["summary", "notes", "description", "report_text"],
    )


@router.get("/homes/{home_id}/incidents")
def home_incidents(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "incidents",
        "incident",
        aliases=["incidents"],
        title_keys=["title", "incident_type", "name"],
        summary_keys=["summary", "description", "notes"],
    )


@router.get("/homes/{home_id}/safeguarding")
def home_safeguarding(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "incidents",
        "incident",
        aliases=["safeguarding", "incidents"],
        title_keys=["title", "incident_type", "name"],
        summary_keys=["summary", "description", "notes"],
    )


@router.get("/homes/{home_id}/inspection-readiness")
def home_inspection_readiness(home_id: int, request: Request):
    return _inspection_improvement_actions_payload(home_id, request)


@router.get("/homes/{home_id}/quality")
def home_quality(home_id: int, request: Request):
    return {
        **_generic_home_table_payload(
            home_id,
            request,
            "quality_audits",
            "quality_audit",
            aliases=["audits", "quality_audits"],
            title_keys=["audit_title", "title", "audit_type"],
            summary_keys=["summary", "concerns", "recommendations", "notes"],
        ),
        "quality": True,
    }


@router.get("/homes/{home_id}/compliance")
def home_compliance(home_id: int, request: Request):
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            compliance_items = _fetch_rows_if_possible(cur, "compliance_items", home_id, limit=200)
            documents = _fetch_rows_if_possible(cur, "documents", home_id, limit=200)
            supervisions = _fetch_rows_if_possible(cur, "supervisions", home_id, limit=200)
            training_records = _fetch_rows_if_possible(cur, "training_records", home_id, limit=200)

            overdue_count = 0
            for row in compliance_items + documents + supervisions + training_records:
                status = _normalise_status(row.get("status"), "").lower()
                if status in {"overdue", "missing", "expired", "review_due", "due_soon", "incomplete"}:
                    overdue_count += 1

            score = max(45, min(97, 92 - overdue_count * 4))

            return {
                "ok": True,
                "items": compliance_items,
                "compliance": compliance_items,
                "summary": {
                    "home_id": home_id,
                    "compliance_score": score,
                    "score": score,
                    "overdue_count": overdue_count,
                },
            }
    finally:
        release_db_connection(conn)


@router.get("/homes/{home_id}/ofsted-dashboard")
def home_ofsted_dashboard(home_id: int, request: Request):
    header = _inspection_ui_header_payload(home_id, request)
    return {
        "ok": True,
        "summary": header["summary"],
        "dashboard": header["summary"],
        "items": header["items"],
    }


@router.get("/homes/{home_id}/sccif-evidence")
def home_sccif_evidence(home_id: int, request: Request):
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            docs = _fetch_rows_if_possible(cur, "documents", home_id, limit=120)
            incidents = _fetch_rows_if_possible(cur, "incidents", home_id, limit=120)
            reports = _fetch_rows_if_possible(cur, "reports", home_id, limit=120)
            keywork = _fetch_rows_if_possible(cur, "keywork", home_id, limit=120)

            items = []

            for row in docs:
                items.append(
                    {
                        **row,
                        "record_type": "sccif_evidence",
                        "title": _normalise_title(row, "title", "document_type", default="Document evidence"),
                        "area": "Leadership and management",
                        "source_type": "document",
                        "status": _normalise_status(row.get("status"), "available"),
                        "summary": _normalise_summary(row, "summary", "notes", "description"),
                    }
                )

            for row in incidents:
                items.append(
                    {
                        **row,
                        "record_type": "sccif_evidence",
                        "title": _normalise_title(row, "title", "incident_type", default="Incident evidence"),
                        "area": "Helped and protected",
                        "source_type": "incident",
                        "status": _normalise_status(row.get("status"), "reviewed"),
                        "summary": _normalise_summary(row, "summary", "description", "notes"),
                    }
                )

            for row in reports + keywork:
                items.append(
                    {
                        **row,
                        "record_type": "sccif_evidence",
                        "title": _normalise_title(row, "title", "report_type", default="Evidence"),
                        "area": "Overall experiences and progress of children and young people",
                        "source_type": "report",
                        "status": _normalise_status(row.get("status"), "reviewed"),
                        "summary": _normalise_summary(row, "summary", "notes", "description"),
                    }
                )

            return {
                "ok": True,
                "items": items[:150],
                "evidence": items[:150],
                "summary": {
                    "home_id": home_id,
                    "readiness_score": max(40, min(95, 60 + min(len(items), 20))),
                },
            }
    finally:
        release_db_connection(conn)


@router.get("/homes/{home_id}/judgement-builder")
def home_judgement_builder(home_id: int, request: Request):
    dashboard = _inspection_ui_header_payload(home_id, request)
    evidence = home_sccif_evidence(home_id, request)
    actions = _inspection_ui_actions_payload(home_id, request)

    return {
        "ok": True,
        "summary": dashboard["summary"],
        "items": evidence.get("items", [])[:60],
        "evidence": evidence.get("items", [])[:60],
        "actions": actions.get("items", [])[:40],
    }


@router.get("/homes/{home_id}/manager-review-queue")
def home_manager_review_queue(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "manager_review_queue",
        "manager_review_queue",
        aliases=["manager_review_queue"],
        title_keys=["title", "record_type", "source_table"],
        summary_keys=["summary", "review_reason", "notes"],
        status_key="workflow_status",
    )


@router.get("/homes/{home_id}/quality-audits")
def home_quality_audits(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "quality_audits",
        "quality_audit",
        aliases=["quality_audits"],
        title_keys=["audit_title", "title", "audit_type"],
        summary_keys=["summary", "concerns", "recommendations", "notes"],
    )


@router.get("/homes/{home_id}/quality-audit-findings")
def home_quality_audit_findings(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "quality_audit_findings",
        "quality_audit_finding",
        aliases=["quality_audit_findings"],
        title_keys=["title", "finding_type"],
        summary_keys=["details", "summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/quality-audit-actions")
def home_quality_audit_actions(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "quality_audit_actions",
        "quality_audit_action",
        aliases=["quality_audit_actions"],
        title_keys=["action_title", "title"],
        summary_keys=["action_description", "summary", "completion_notes", "notes"],
    )


@router.get("/homes/{home_id}/compliance-items")
def home_compliance_items(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "compliance_items",
        "compliance_item",
        aliases=["compliance_items"],
        title_keys=["title", "document_type", "record_type"],
        summary_keys=["summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/reg44-visits")
def home_reg44_visits(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "reg44_visits",
        "reg44_visit",
        aliases=["reg44_visits"],
        title_keys=["title", "visit_type"],
        summary_keys=["overall_summary", "recommendations_summary", "summary", "notes"],
    )


@router.get("/homes/{home_id}/reg44-findings")
def home_reg44_findings(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "reg44_findings",
        "reg44_finding",
        aliases=["reg44_findings"],
        title_keys=["title", "finding_type"],
        summary_keys=["finding_text", "summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/reg44-actions")
def home_reg44_actions(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "reg44_actions",
        "reg44_action",
        aliases=["reg44_actions"],
        title_keys=["action_title", "title"],
        summary_keys=["action_description", "summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/reg45-reviews")
def home_reg45_reviews(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "reg45_reviews",
        "reg45_review",
        aliases=["reg45_reviews"],
        title_keys=["title", "review_type"],
        summary_keys=["overall_quality_summary", "action_plan_summary", "summary", "notes"],
    )


@router.get("/homes/{home_id}/reg45-actions")
def home_reg45_actions(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "reg45_actions",
        "reg45_action",
        aliases=["reg45_actions"],
        title_keys=["action_title", "title"],
        summary_keys=["action_description", "summary", "notes", "description"],
    )


@router.get("/homes/{home_id}/inspection-scores")
def home_inspection_scores(home_id: int, request: Request):
    return _inspection_scores_payload(home_id, request)


@router.get("/homes/{home_id}/inspection-section-scores")
def home_inspection_section_scores(home_id: int, request: Request):
    return _inspection_section_scores_payload(home_id, request)


@router.get("/homes/{home_id}/inspection-score-reasons")
def home_inspection_score_reasons(home_id: int, request: Request):
    return _inspection_score_reasons_payload(home_id, request)


@router.get("/homes/{home_id}/inspection-lines-of-enquiry")
def home_inspection_lines_of_enquiry(home_id: int, request: Request):
    return _inspection_lines_payload(home_id, request)


@router.get("/homes/{home_id}/inspection-improvement-actions")
def home_inspection_improvement_actions(home_id: int, request: Request):
    return _inspection_improvement_actions_payload(home_id, request)


@compat_router.get("/inspection/ui/home-cards")
def inspection_ui_home_cards(request: Request):
    return _inspection_ui_home_cards_payload(request)


@compat_router.get("/inspection/ui/homes/{home_id}/header")
def inspection_ui_home_header(home_id: int, request: Request):
    return _inspection_ui_header_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/sections")
def inspection_ui_home_sections(home_id: int, request: Request):
    return _inspection_ui_sections_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/reasons")
def inspection_ui_home_reasons(home_id: int, request: Request):
    return _inspection_ui_reasons_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/actions")
def inspection_ui_home_actions(home_id: int, request: Request):
    return _inspection_ui_actions_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/tasks")
def inspection_ui_home_tasks(home_id: int, request: Request):
    return _inspection_ui_tasks_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/briefing")
def inspection_ui_home_briefing(home_id: int, request: Request):
    return _inspection_ui_briefing_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/prep-72h")
def inspection_ui_home_prep_72h(home_id: int, request: Request):
    return _inspection_ui_prep_72h_payload(home_id, request)
