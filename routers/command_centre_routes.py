from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.current_user import get_current_user
from db.connection import get_db

router = APIRouter(prefix="/command-centre", tags=["Command Centre"])

PROVIDER_LEVEL_ROLES = {"admin", "provider_admin", "super_admin", "superadmin", "administrator", "ri", "responsible_individual", "regional_manager"}


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    values = current_user.get("allowed_home_ids") or current_user.get("allowedHomeIds") or []
    allowed: set[int] = set()
    if isinstance(values, list):
        for value in values:
            parsed = _safe_int(value)
            if parsed is not None:
                allowed.add(parsed)
    home_id = _safe_int(current_user.get("home_id") or current_user.get("homeId"))
    if home_id is not None:
        allowed.add(home_id)
    return allowed


def _home_id(current_user: dict[str, Any], requested_home_id: int | None) -> int | None:
    role = _role(current_user)
    if role in PROVIDER_LEVEL_ROLES:
        return requested_home_id if requested_home_id else _safe_int(current_user.get("home_id"))

    allowed = _allowed_home_ids(current_user)
    if requested_home_id:
        if requested_home_id not in allowed:
            raise HTTPException(status_code=403, detail="Access denied")
        return requested_home_id

    if len(allowed) == 1:
        return next(iter(allowed))

    return _safe_int(current_user.get("home_id") or current_user.get("homeId"))


def _home_filter_sql(home_id: int | None, table_alias: str = "") -> tuple[str, tuple[Any, ...]]:
    if home_id is None:
        return "", ()
    prefix = f"{table_alias}." if table_alias else ""
    return f" AND {prefix}home_id = %s", (home_id,)


def _fetch_all(cur, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    cur.execute(query, params)
    return [dict(row) for row in (cur.fetchall() or [])]


def _fetch_one(cur, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any]:
    cur.execute(query, params)
    row = cur.fetchone()
    return dict(row) if row else {}


@router.get("")
def get_command_centre(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    active_home_id = _home_id(current_user, home_id)
    role = _role(current_user)

    task_filter, task_params = _home_filter_sql(active_home_id)
    yp_filter, yp_params = _home_filter_sql(active_home_id)
    admission_filter, admission_params = _home_filter_sql(active_home_id)

    with conn.cursor() as cur:
        summary = {}

        summary.update(_fetch_one(cur, f"""
            SELECT COUNT(*)::int AS open_tasks
            FROM tasks
            WHERE COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
            {task_filter}
        """, task_params))

        summary.update(_fetch_one(cur, f"""
            SELECT COUNT(*)::int AS overdue_tasks
            FROM tasks
            WHERE COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
              AND due_at IS NOT NULL
              AND due_at < NOW()
            {task_filter}
        """, task_params))

        summary.update(_fetch_one(cur, f"""
            SELECT COUNT(*)::int AS children_in_home
            FROM young_people
            WHERE COALESCE(placement_status, 'active') NOT IN ('discharged', 'closed')
            {yp_filter}
        """, yp_params))

        summary.update(_fetch_one(cur, f"""
            SELECT COUNT(*)::int AS active_admissions
            FROM admissions
            WHERE COALESCE(status, 'referral_received') NOT IN ('closed', 'declined')
            {admission_filter}
        """, admission_params))

        tasks = _fetch_all(cur, f"""
            SELECT id, title, status, priority, source, home_id, young_person_id, admission_id, due_at, created_at
            FROM tasks
            WHERE COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
            {task_filter}
            ORDER BY
                CASE COALESCE(priority, 'normal')
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,
                due_at ASC NULLS LAST,
                created_at DESC
            LIMIT 30
        """, task_params)

        admissions = _fetch_all(cur, f"""
            SELECT id, home_id, young_person_id, status, placing_authority,
                   social_worker_name, legal_status, admission_date, created_at
            FROM admissions
            WHERE COALESCE(status, 'referral_received') NOT IN ('closed', 'declined')
            {admission_filter}
            ORDER BY created_at DESC
            LIMIT 20
        """, admission_params)

        incident_home_clause = " AND yp.home_id = %s" if active_home_id is not None else ""
        incident_params = (active_home_id,) if active_home_id is not None else ()
        incidents_needing_review = _fetch_all(cur, f"""
            SELECT i.id, i.young_person_id, yp.home_id, yp.first_name, yp.last_name,
                   i.incident_type, i.severity, i.manager_review_status, i.created_at
            FROM incidents i
            JOIN young_people yp ON yp.id = i.young_person_id
            WHERE COALESCE(i.archived, FALSE) = FALSE
              AND COALESCE(i.manager_review_status, 'draft') NOT IN ('approved', 'closed')
              {incident_home_clause}
            ORDER BY i.created_at DESC
            LIMIT 20
        """, incident_params)

        risk_home_clause = " AND yp.home_id = %s" if active_home_id is not None else ""
        risk_params = (active_home_id,) if active_home_id is not None else ()
        high_risks = _fetch_all(cur, f"""
            SELECT r.id, r.young_person_id, yp.home_id, yp.first_name, yp.last_name,
                   r.title, r.category, r.severity, r.likelihood, r.review_date, r.status
            FROM risk_assessments r
            JOIN young_people yp ON yp.id = r.young_person_id
            WHERE COALESCE(r.archived, FALSE) = FALSE
              AND COALESCE(r.status, 'active') = 'active'
              AND (LOWER(COALESCE(r.severity, '')) IN ('high', 'critical')
                   OR LOWER(COALESCE(r.likelihood, '')) IN ('high', 'critical'))
              {risk_home_clause}
            ORDER BY r.review_date ASC NULLS LAST, r.created_at DESC
            LIMIT 20
        """, risk_params)

        compliance_due = _fetch_all(cur, """
            SELECT * FROM (
                SELECT yp.home_id, yp.id AS young_person_id, yp.first_name, yp.last_name,
                       'risk_review' AS type, r.id AS item_id,
                       COALESCE(r.title, r.category, 'Risk review') AS title,
                       r.review_date AS due_date
                FROM risk_assessments r
                JOIN young_people yp ON yp.id = r.young_person_id
                WHERE r.review_date IS NOT NULL AND COALESCE(r.archived, FALSE) = FALSE
                UNION ALL
                SELECT yp.home_id, yp.id AS young_person_id, yp.first_name, yp.last_name,
                       'support_plan_review' AS type, sp.id AS item_id,
                       COALESCE(sp.title, sp.plan_type, 'Plan review') AS title,
                       sp.review_date AS due_date
                FROM support_plans sp
                JOIN young_people yp ON yp.id = sp.young_person_id
                WHERE sp.review_date IS NOT NULL AND COALESCE(sp.archived, FALSE) = FALSE
                UNION ALL
                SELECT yp.home_id, yp.id AS young_person_id, yp.first_name, yp.last_name,
                       'statutory_document_review' AS type, sd.id AS item_id,
                       COALESCE(sd.title, sd.document_type, 'Statutory document') AS title,
                       COALESCE(sd.review_date, sd.expiry_date) AS due_date
                FROM statutory_documents sd
                JOIN young_people yp ON yp.id = sd.young_person_id
                WHERE COALESCE(sd.archived, FALSE) = FALSE
                  AND (sd.review_date IS NOT NULL OR sd.expiry_date IS NOT NULL)
            ) x
            WHERE due_date <= CURRENT_DATE + INTERVAL '7 days'
              AND (%s IS NULL OR home_id = %s)
            ORDER BY due_date ASC
            LIMIT 30
        """, (active_home_id, active_home_id))

    alerts = []
    for task in tasks[:10]:
        if task.get("priority") in {"high", "critical"} or task.get("due_at"):
            alerts.append({"type": "task", "level": task.get("priority") or "normal", "title": task.get("title"), "detail": f"Source: {task.get('source') or 'task'}", "task_id": task.get("id")})

    for incident in incidents_needing_review[:10]:
        alerts.append({"type": "incident_review", "level": incident.get("severity") or "medium", "title": "Incident needs manager review", "young_person_name": " ".join([str(incident.get("first_name") or ""), str(incident.get("last_name") or "")]).strip(), "incident_id": incident.get("id")})

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "role": role,
        "home_id": active_home_id,
        "summary": {
            "children_in_home": summary.get("children_in_home", 0),
            "active_admissions": summary.get("active_admissions", 0),
            "open_tasks": summary.get("open_tasks", 0),
            "overdue_tasks": summary.get("overdue_tasks", 0),
            "incidents_needing_review": len(incidents_needing_review),
            "high_risk_items": len(high_risks),
            "compliance_due": len(compliance_due),
        },
        "alerts": alerts[:20],
        "tasks": tasks,
        "admissions": admissions,
        "incidents_needing_review": incidents_needing_review,
        "high_risks": high_risks,
        "compliance_due": compliance_due,
        "next_best_actions": _next_best_actions(role, tasks, incidents_needing_review, high_risks, compliance_due, admissions),
    }


def _next_best_actions(role: str, tasks: list[dict[str, Any]], incidents: list[dict[str, Any]], risks: list[dict[str, Any]], compliance: list[dict[str, Any]], admissions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    if incidents and role in {"admin", "provider_admin", "manager", "registered_manager"}:
        actions.append({"priority": "high", "title": "Review open incidents", "count": len(incidents), "href": "/incidents"})
    if tasks:
        actions.append({"priority": "high", "title": "Complete due tasks", "count": len(tasks), "href": "/tasks"})
    if risks:
        actions.append({"priority": "high", "title": "Review high-risk plans", "count": len(risks), "href": "/risk"})
    if compliance:
        actions.append({"priority": "high", "title": "Clear compliance due items", "count": len(compliance), "href": "/compliance"})
    if admissions:
        actions.append({"priority": "medium", "title": "Progress active admissions", "count": len(admissions), "href": "/admissions"})
    return actions[:8]
