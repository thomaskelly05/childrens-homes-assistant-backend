from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from auth.current_user import get_current_user
from db.connection import get_db

logger = logging.getLogger("indicare.command_centre")
router = APIRouter(prefix="/command-centre", tags=["Command Centre"])

PROVIDER_LEVEL_ROLES = {"admin", "provider_admin", "super_admin", "superadmin", "administrator", "ri", "responsible_individual", "regional_manager", "manager", "registered_manager"}


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
        return requested_home_id if requested_home_id else _safe_int(current_user.get("home_id") or current_user.get("homeId"))
    allowed = _allowed_home_ids(current_user)
    if requested_home_id:
        if requested_home_id not in allowed:
            raise HTTPException(status_code=403, detail="Access denied")
        return requested_home_id
    if len(allowed) == 1:
        return next(iter(allowed))
    return _safe_int(current_user.get("home_id") or current_user.get("homeId"))


def _rollback(conn) -> None:
    try:
        conn.rollback()
    except Exception:
        pass


def _empty_payload(*, role: str, home_id: int | None, available: bool = True, message: str | None = None) -> dict[str, Any]:
    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "available": available,
        "message": message,
        "role": role,
        "home_id": home_id,
        "summary": {
            "children_in_home": 0,
            "active_admissions": 0,
            "open_tasks": 0,
            "overdue_tasks": 0,
            "incidents_needing_review": 0,
            "high_risk_items": 0,
            "compliance_due": 0,
        },
        "alerts": [],
        "tasks": [],
        "admissions": [],
        "incidents_needing_review": [],
        "high_risks": [],
        "compliance_due": [],
        "next_best_actions": [
            {
                "priority": "medium",
                "title": "Care OS is ready",
                "detail": message or "No urgent actions are visible yet.",
                "href": "/care-os#young-people",
            }
        ],
    }


def _query(cur, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    cur.execute(sql, params)
    return [dict(row) for row in (cur.fetchall() or [])]


def _count(cur, sql: str, params: tuple[Any, ...] = ()) -> int:
    cur.execute(sql, params)
    row = cur.fetchone() or {}
    return int(row.get("count") or 0)


def _home_clause(home_id: int | None, column: str = "home_id") -> tuple[str, tuple[Any, ...]]:
    if home_id is None:
        return "", ()
    return f" AND {column} = %s", (home_id,)


@router.get("")
def get_command_centre(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = _role(current_user)
    active_home_id = _home_id(current_user, home_id)
    payload = _empty_payload(role=role, home_id=active_home_id)

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            home_filter, home_params = _home_clause(active_home_id)

            try:
                payload["summary"]["children_in_home"] = _count(
                    cur,
                    f"""
                    SELECT COUNT(*)::int AS count
                    FROM young_people
                    WHERE COALESCE(placement_status, 'active') NOT IN ('discharged', 'closed')
                    {home_filter}
                    """,
                    home_params,
                )
            except Exception as exc:
                _rollback(conn)
                logger.warning("command_centre_young_people_unavailable error=%s", exc)

            try:
                task_filter, task_params = _home_clause(active_home_id)
                payload["summary"]["open_tasks"] = _count(
                    cur,
                    f"""
                    SELECT COUNT(*)::int AS count
                    FROM tasks
                    WHERE COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
                    {task_filter}
                    """,
                    task_params,
                )
                payload["summary"]["overdue_tasks"] = _count(
                    cur,
                    f"""
                    SELECT COUNT(*)::int AS count
                    FROM tasks
                    WHERE COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
                      AND due_at IS NOT NULL
                      AND due_at < NOW()
                    {task_filter}
                    """,
                    task_params,
                )
                payload["tasks"] = _query(
                    cur,
                    f"""
                    SELECT id, title, status, priority, source, home_id, young_person_id, admission_id, assigned_to, due_at, created_at
                    FROM tasks
                    WHERE COALESCE(status, 'pending') NOT IN ('completed', 'done', 'closed')
                    {task_filter}
                    ORDER BY
                      CASE COALESCE(priority, 'normal')
                        WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4
                      END,
                      due_at ASC NULLS LAST,
                      created_at DESC
                    LIMIT 30
                    """,
                    task_params,
                )
            except Exception as exc:
                _rollback(conn)
                logger.warning("command_centre_tasks_unavailable error=%s", exc)

            try:
                admission_filter, admission_params = _home_clause(active_home_id)
                payload["summary"]["active_admissions"] = _count(
                    cur,
                    f"""
                    SELECT COUNT(*)::int AS count
                    FROM admissions
                    WHERE COALESCE(status, 'referral_received') NOT IN ('closed', 'declined')
                    {admission_filter}
                    """,
                    admission_params,
                )
                payload["admissions"] = _query(
                    cur,
                    f"""
                    SELECT id, home_id, young_person_id, status, placing_authority, social_worker_name, legal_status, admission_date, created_at
                    FROM admissions
                    WHERE COALESCE(status, 'referral_received') NOT IN ('closed', 'declined')
                    {admission_filter}
                    ORDER BY created_at DESC
                    LIMIT 20
                    """,
                    admission_params,
                )
            except Exception as exc:
                _rollback(conn)
                logger.warning("command_centre_admissions_unavailable error=%s", exc)

            try:
                incident_clause = " AND yp.home_id = %s" if active_home_id is not None else ""
                incident_params = (active_home_id,) if active_home_id is not None else ()
                payload["incidents_needing_review"] = _query(
                    cur,
                    f"""
                    SELECT i.id, i.young_person_id, yp.home_id, yp.first_name, yp.last_name,
                           i.incident_type, i.severity, i.manager_review_status, i.created_at
                    FROM incidents i
                    JOIN young_people yp ON yp.id = i.young_person_id
                    WHERE COALESCE(i.archived, FALSE) = FALSE
                      AND COALESCE(i.manager_review_status, 'draft') NOT IN ('approved', 'closed', 'reviewed')
                      {incident_clause}
                    ORDER BY i.created_at DESC
                    LIMIT 20
                    """,
                    incident_params,
                )
                payload["summary"]["incidents_needing_review"] = len(payload["incidents_needing_review"])
            except Exception as exc:
                _rollback(conn)
                logger.warning("command_centre_incidents_unavailable error=%s", exc)

            try:
                risk_clause = " AND yp.home_id = %s" if active_home_id is not None else ""
                risk_params = (active_home_id,) if active_home_id is not None else ()
                payload["high_risks"] = _query(
                    cur,
                    f"""
                    SELECT r.id, r.young_person_id, yp.home_id, yp.first_name, yp.last_name,
                           r.title, r.category, r.severity, r.likelihood, r.review_date, r.status
                    FROM risk_assessments r
                    JOIN young_people yp ON yp.id = r.young_person_id
                    WHERE COALESCE(r.archived, FALSE) = FALSE
                      AND COALESCE(r.status, 'active') = 'active'
                      AND (LOWER(COALESCE(r.severity, '')) IN ('high', 'critical')
                           OR LOWER(COALESCE(r.likelihood, '')) IN ('high', 'critical'))
                      {risk_clause}
                    ORDER BY r.review_date ASC NULLS LAST, r.created_at DESC
                    LIMIT 20
                    """,
                    risk_params,
                )
                payload["summary"]["high_risk_items"] = len(payload["high_risks"])
            except Exception as exc:
                _rollback(conn)
                logger.warning("command_centre_risks_unavailable error=%s", exc)

    except Exception as exc:
        _rollback(conn)
        logger.warning("command_centre_unavailable role=%s home_id=%s error=%s", role, active_home_id, exc)
        return _empty_payload(role=role, home_id=active_home_id, available=False, message="Command Centre data is not available yet.")

    payload["alerts"] = _alerts(payload.get("tasks", []), payload.get("incidents_needing_review", []), payload.get("high_risks", []))
    payload["next_best_actions"] = _next_best_actions(role, payload.get("tasks", []), payload.get("incidents_needing_review", []), payload.get("high_risks", []), payload.get("compliance_due", []), payload.get("admissions", []))
    return payload


def _alerts(tasks: list[dict[str, Any]], incidents: list[dict[str, Any]], risks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    for task in tasks[:10]:
        if task.get("priority") in {"high", "critical"} or task.get("due_at"):
            alerts.append({"type": "task", "level": task.get("priority") or "normal", "title": task.get("title") or "Task requires attention", "detail": f"Source: {task.get('source') or 'task'}", "task_id": task.get("id")})
    for incident in incidents[:10]:
        alerts.append({"type": "incident_review", "level": incident.get("severity") or "medium", "title": "Incident needs manager review", "young_person_name": " ".join([str(incident.get("first_name") or ""), str(incident.get("last_name") or "")]).strip(), "incident_id": incident.get("id")})
    for risk in risks[:10]:
        alerts.append({"type": "risk", "level": risk.get("severity") or "high", "title": risk.get("title") or "High risk item", "young_person_name": " ".join([str(risk.get("first_name") or ""), str(risk.get("last_name") or "")]).strip(), "risk_id": risk.get("id")})
    return alerts[:20]


def _next_best_actions(role: str, tasks: list[dict[str, Any]], incidents: list[dict[str, Any]], risks: list[dict[str, Any]], compliance: list[dict[str, Any]], admissions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    if incidents and role in {"admin", "provider_admin", "manager", "registered_manager", "ri", "responsible_individual"}:
        actions.append({"priority": "high", "title": "Review open incidents", "count": len(incidents), "href": "/care-os#young-people"})
    if tasks:
        actions.append({"priority": "high", "title": "Complete due tasks", "count": len(tasks), "href": "/care-os#tasks"})
    if risks:
        actions.append({"priority": "high", "title": "Review high-risk plans", "count": len(risks), "href": "/care-os#safeguarding"})
    if compliance:
        actions.append({"priority": "high", "title": "Clear compliance due items", "count": len(compliance), "href": "/care-os#quality"})
    if admissions:
        actions.append({"priority": "medium", "title": "Progress active admissions", "count": len(admissions), "href": "/care-os#young-people"})
    if not actions:
        actions.append({"priority": "normal", "title": "System ready", "detail": "No urgent actions are visible yet.", "href": "/care-os#young-people"})
    return actions[:8]
