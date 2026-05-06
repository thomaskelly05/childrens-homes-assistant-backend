from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _get_young_person_home_id(conn, young_person_id: int) -> int | None:
    with conn.cursor() as cur:
        cur.execute("SELECT home_id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
        row = cur.fetchone()
    return _safe_int(row.get("home_id")) if row else None


def _manager_user_ids_for_home(conn, home_id: int | None) -> list[int]:
    if home_id is None:
        return []
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id
            FROM users
            WHERE home_id = %s
              AND COALESCE(is_active, TRUE) = TRUE
              AND COALESCE(archived, FALSE) = FALSE
              AND LOWER(COALESCE(role, '')) IN ('manager', 'registered_manager', 'deputy_manager', 'provider_admin', 'regional_manager')
            """,
            (home_id,),
        )
        rows = cur.fetchall() or []
    return [int(row.get("id")) for row in rows if row.get("id") is not None]


def create_notification(
    conn,
    *,
    user_id: int,
    title: str,
    body: str | None = None,
    home_id: int | None = None,
    young_person_id: int | None = None,
    notification_type: str = "workflow",
    priority: str = "normal",
    href: str | None = None,
    source: str | None = None,
    source_ref_type: str | None = None,
    source_ref_id: int | None = None,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notifications (
                user_id, home_id, young_person_id, title, body,
                notification_type, priority, href, source, source_ref_type, source_ref_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (user_id, home_id, young_person_id, title, body, notification_type, priority, href, source, source_ref_type, source_ref_id),
        )
        return cur.fetchone()


def notify_managers_for_home(
    conn,
    *,
    home_id: int | None,
    title: str,
    body: str | None = None,
    young_person_id: int | None = None,
    priority: str = "normal",
    href: str | None = None,
    source: str | None = None,
    source_ref_type: str | None = None,
    source_ref_id: int | None = None,
) -> list[dict[str, Any]]:
    notifications = []
    for user_id in _manager_user_ids_for_home(conn, home_id):
        notification = create_notification(
            conn,
            user_id=user_id,
            title=title,
            body=body,
            home_id=home_id,
            young_person_id=young_person_id,
            priority=priority,
            href=href,
            source=source,
            source_ref_type=source_ref_type,
            source_ref_id=source_ref_id,
        )
        if notification:
            notifications.append(notification)
    return notifications


def create_workflow_task(
    conn,
    *,
    title: str,
    source: str,
    home_id: int | None = None,
    young_person_id: int | None = None,
    admission_id: int | None = None,
    assigned_to: int | None = None,
    due_in_hours: int = 24,
    priority: str = "normal",
    source_ref_type: str | None = None,
    source_ref_id: int | None = None,
) -> dict[str, Any] | None:
    due_at = datetime.utcnow() + timedelta(hours=due_in_hours)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO tasks (
                title, home_id, young_person_id, admission_id, assigned_to,
                due_at, created_at, source, status, priority, source_ref_type, source_ref_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, 'pending', %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING *
            """,
            (title, home_id, young_person_id, admission_id, assigned_to, due_at, source, priority, source_ref_type, source_ref_id),
        )
        return cur.fetchone()


def trigger_after_incident_created(conn, *, young_person_id: int, incident: dict[str, Any], actor_user_id: int | None = None) -> list[dict[str, Any]]:
    home_id = _safe_int(incident.get("home_id")) or _get_young_person_home_id(conn, young_person_id)
    incident_id = _safe_int(incident.get("id"))
    severity = str(incident.get("severity") or "").lower()
    incident_type = str(incident.get("incident_type") or "incident").lower()
    priority = "high" if severity in {"high", "critical"} else "normal"
    tasks = []

    tasks.append(create_workflow_task(
        conn,
        title="Manager review required for incident",
        source="incident",
        home_id=home_id,
        young_person_id=young_person_id,
        due_in_hours=24,
        priority=priority,
        source_ref_type="incident",
        source_ref_id=incident_id,
    ))

    notify_managers_for_home(
        conn,
        home_id=home_id,
        young_person_id=young_person_id,
        title="Incident requires review",
        body="A new incident has been logged and needs manager review.",
        priority=priority,
        href=f"/young-people/{young_person_id}/incidents",
        source="incident",
        source_ref_type="incident",
        source_ref_id=incident_id,
    )

    if incident.get("body_map_required") or incident.get("physical_intervention_used"):
        tasks.append(create_workflow_task(
            conn,
            title="Complete body map and physical intervention follow-up",
            source="incident_body_map",
            home_id=home_id,
            young_person_id=young_person_id,
            due_in_hours=12,
            priority="high",
            source_ref_type="incident",
            source_ref_id=incident_id,
        ))

    if "missing" in incident_type:
        tasks.append(create_workflow_task(
            conn,
            title="Arrange return home interview and missing from care review",
            source="missing_episode",
            home_id=home_id,
            young_person_id=young_person_id,
            due_in_hours=24,
            priority="high",
            source_ref_type="incident",
            source_ref_id=incident_id,
        ))

    if incident.get("external_notification_required"):
        tasks.append(create_workflow_task(
            conn,
            title="Complete external notification and evidence upload",
            source="external_notification",
            home_id=home_id,
            young_person_id=young_person_id,
            due_in_hours=12,
            priority="high",
            source_ref_type="incident",
            source_ref_id=incident_id,
        ))

    conn.commit()
    return [task for task in tasks if task]


def trigger_after_risk_updated(conn, *, young_person_id: int, risk: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any] | None:
    home_id = _safe_int(risk.get("home_id")) or _get_young_person_home_id(conn, young_person_id)
    risk_id = _safe_int(risk.get("id"))
    severity = str(risk.get("severity") or "").lower()
    likelihood = str(risk.get("likelihood") or "").lower()

    if severity not in {"high", "critical"} and likelihood not in {"high", "critical"}:
        return None

    task = create_workflow_task(
        conn,
        title="Manager review required for high risk assessment",
        source="risk_escalation",
        home_id=home_id,
        young_person_id=young_person_id,
        due_in_hours=24,
        priority="high",
        source_ref_type="risk_assessment",
        source_ref_id=risk_id,
    )
    notify_managers_for_home(
        conn,
        home_id=home_id,
        young_person_id=young_person_id,
        title="High risk assessment needs review",
        body="A risk assessment has been marked high or critical.",
        priority="high",
        href=f"/young-people/{young_person_id}/risk",
        source="risk_escalation",
        source_ref_type="risk_assessment",
        source_ref_id=risk_id,
    )
    conn.commit()
    return task


def trigger_compliance_tasks_for_young_person(conn, *, young_person_id: int) -> list[dict[str, Any]]:
    home_id = _get_young_person_home_id(conn, young_person_id)
    created = []

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT * FROM (
                SELECT 'support_plan_review' AS source, id, COALESCE(title, plan_type, 'Plan review') AS title, review_date AS due_date
                FROM support_plans
                WHERE young_person_id = %s AND review_date IS NOT NULL AND COALESCE(archived, FALSE) = FALSE
                UNION ALL
                SELECT 'risk_review' AS source, id, COALESCE(title, category, 'Risk review') AS title, review_date AS due_date
                FROM risk_assessments
                WHERE young_person_id = %s AND review_date IS NOT NULL AND COALESCE(archived, FALSE) = FALSE
                UNION ALL
                SELECT 'statutory_document_review' AS source, id, COALESCE(title, document_type, 'Statutory document') AS title, COALESCE(review_date, expiry_date) AS due_date
                FROM statutory_documents
                WHERE young_person_id = %s AND COALESCE(archived, FALSE) = FALSE AND (review_date IS NOT NULL OR expiry_date IS NOT NULL)
            ) x
            WHERE due_date <= CURRENT_DATE + INTERVAL '7 days'
            ORDER BY due_date ASC
            """,
            (young_person_id, young_person_id, young_person_id),
        )
        rows = cur.fetchall() or []

    for row in rows:
        source = row.get("source") or "compliance"
        item_id = _safe_int(row.get("id"))
        title = row.get("title") or "Compliance item"
        created.append(create_workflow_task(
            conn,
            title=f"Compliance due: {title}",
            source=source,
            home_id=home_id,
            young_person_id=young_person_id,
            due_in_hours=24,
            priority="high",
            source_ref_type=source,
            source_ref_id=item_id,
        ))
        notify_managers_for_home(
            conn,
            home_id=home_id,
            young_person_id=young_person_id,
            title=f"Compliance due: {title}",
            body="A compliance item is due or overdue within the next 7 days.",
            priority="high",
            href=f"/young-people/{young_person_id}/compliance",
            source=source,
            source_ref_type=source,
            source_ref_id=item_id,
        )

    conn.commit()
    return [task for task in created if task]
