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

    if role in {"admin", "administrator", "super_admin", "superadmin", "ri", "responsible_individual"}:
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
    order_by: str = "updated_at DESC NULLS LAST, created_at DESC NULLS LAST",
    limit: int = 50,
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


def _normalise_summary(row: dict[str, Any], *keys: str, default: str = "Record available.") -> str:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return default


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

            tasks = _fetch_rows_if_possible(cur, "tasks", home_id, limit=200)
            incidents = _fetch_rows_if_possible(cur, "incidents", home_id, limit=200)
            quality_actions = _fetch_rows_if_possible(cur, "quality_audit_actions", home_id, limit=200)
            reg44_actions = _fetch_rows_if_possible(cur, "reg44_actions", home_id, limit=200)
            reg45_actions = _fetch_rows_if_possible(cur, "reg45_actions", home_id, limit=200)

            open_action_count = 0
            for row in quality_actions + reg44_actions + reg45_actions:
                status = _normalise_status(row.get("status"), "open").lower()
                if status not in {"closed", "completed", "resolved", "cancelled"}:
                    open_action_count += 1

            incident_pressure = len(incidents)
            confidence_score = max(40, min(96, 90 - open_action_count * 4 - min(incident_pressure, 6) * 2))

            leadership_band = (
                "requires_improvement" if open_action_count >= 4 else "good"
            )
            helped_band = (
                "requires_improvement" if incident_pressure >= 8 else "good"
            )
            experiences_band = "good"
            overall_band = (
                "requires_improvement"
                if leadership_band == "requires_improvement" or helped_band == "requires_improvement"
                else "good"
            )

            item = {
                "home_id": home_id,
                "home_name": home.get("name") or home.get("home_name") or f"Home {home_id}",
                "overall_band": overall_band,
                "confidence_score": confidence_score,
                "experiences_band": experiences_band,
                "helped_band": helped_band,
                "leadership_band": leadership_band,
                "top_concerns": (
                    "Open actions and inspection follow-through need closer grip."
                    if open_action_count
                    else "No major inspection concerns are currently surfacing."
                ),
            }

            return {
                "ok": True,
                "items": [item],
                "rows": [item],
                "summary": item,
            }
    finally:
        release_db_connection(conn)


def _inspection_ui_actions_payload(home_id: int, request: Request) -> dict[str, Any]:
    _user_can_access_home(request, home_id)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            rows = []
            rows.extend(_fetch_rows_if_possible(cur, "inspection_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "inspection_improvement_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "quality_audit_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "reg44_actions", home_id, limit=100))
            rows.extend(_fetch_rows_if_possible(cur, "reg45_actions", home_id, limit=100))

            items = []
            for row in rows:
                status = _normalise_status(row.get("status"), "open")
                if status.lower() in {"closed", "completed", "resolved", "cancelled"}:
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
                    "section_name": row.get("section_name") or row.get("category") or "",
                    "owner_user_name": row.get("owner_user_name") or row.get("assigned_to") or "",
                    "due_date": row.get("due_date"),
                }
                items.append(item)

            items.sort(key=lambda x: (x.get("due_date") or "9999-12-31", x.get("priority") or ""))

            return {
                "ok": True,
                "items": items[:100],
                "rows": items[:100],
                "actions": items[:100],
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
                completed = status.lower() in {"closed", "completed", "resolved", "done"}

                item = {
                    **row,
                    "record_type": "inspection_task",
                    "task_title": _normalise_title(row, "title", "task_title", default="Inspection task"),
                    "action_title": _normalise_summary(
                        row,
                        "summary",
                        "description",
                        "notes",
                        default="Inspection-linked task.",
                    ),
                    "task_due_date": row.get("due_date"),
                    "assigned_user_name": row.get("owner_name") or row.get("assigned_to") or "",
                    "assigned_role": row.get("owner_role") or "",
                    "completed": completed,
                    "status": status,
                }
                items.append(item)

            items.sort(key=lambda x: (x.get("task_due_date") or "9999-12-31", x.get("completed")))

            return {
                "ok": True,
                "items": items[:100],
                "rows": items[:100],
                "tasks": items[:100],
            }
    finally:
        release_db_connection(conn)


@router.get("/homes/{home_id}/dashboard")
def home_dashboard(home_id: int, request: Request):
    return _dashboard_payload(home_id, request)


@router.get("/homes/{home_id}/team")
def home_team(home_id: int, request: Request):
    return _team_payload(home_id, request)


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


@router.get("/homes/{home_id}/inspection-readiness")
def home_inspection_readiness(home_id: int, request: Request):
    return _generic_home_table_payload(
        home_id,
        request,
        "inspection_actions",
        "inspection_readiness",
        aliases=["inspection", "readiness"],
        title_keys=["title", "action_title", "requirement"],
        summary_keys=["summary", "action_description", "description", "notes"],
    )


@router.get("/homes/{home_id}/quality")
def home_quality(home_id: int, request: Request):
    return {
        **_generic_home_table_payload(
            home_id,
            request,
            "quality_audits",
            "quality_audit",
            aliases=["audits"],
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


@router.get("/homes/{home_id}/inspection-section-scores")
def home_inspection_section_scores(home_id: int, request: Request):
    _user_can_access_home(request, home_id)

    items = [
        {
            "id": f"{home_id}-leadership",
            "record_type": "inspection_section_score",
            "section_name": "Leadership and management",
            "score_band": "requires_improvement",
            "summary_text": "Action closure and quality oversight still need strengthening.",
            "strengths_text": "Leadership grip is visible in parts.",
            "concerns_text": "Evidence of closure is inconsistent.",
        },
        {
            "id": f"{home_id}-helped",
            "record_type": "inspection_section_score",
            "section_name": "Helped and protected",
            "score_band": "good",
            "summary_text": "Safeguarding systems are generally visible and understood.",
            "strengths_text": "Risk awareness and response are evident.",
            "concerns_text": "Chronology linkage could be sharper.",
        },
    ]

    return {
        "ok": True,
        "items": items,
        "inspection_section_scores": items,
    }


@compat_router.get("/inspection/ui/homes/{home_id}/header")
def inspection_ui_home_header(home_id: int, request: Request):
    return _inspection_ui_header_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/actions")
def inspection_ui_home_actions(home_id: int, request: Request):
    return _inspection_ui_actions_payload(home_id, request)


@compat_router.get("/inspection/ui/homes/{home_id}/tasks")
def inspection_ui_home_tasks(home_id: int, request: Request):
    return _inspection_ui_tasks_payload(home_id, request)