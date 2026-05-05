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
        cur.execute(
            """
            SELECT home_id
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        row = cur.fetchone()
    return _safe_int(row.get("home_id")) if row else None


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
) -> dict[str, Any] | None:
    due_at = datetime.utcnow() + timedelta(hours=due_in_hours)
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO tasks (
                title,
                home_id,
                admission_id,
                assigned_to,
                due_at,
                created_at,
                source,
                status,
                priority
            )
            VALUES (%s, %s, %s, %s, %s, NOW(), %s, 'pending', %s)
            RETURNING *
            """,
            (title, home_id, admission_id, assigned_to, due_at, source, priority),
        )
        task = cur.fetchone()
    return task


def trigger_after_incident_created(
    conn,
    *,
    young_person_id: int,
    incident: dict[str, Any],
    actor_user_id: int | None = None,
) -> list[dict[str, Any]]:
    home_id = _safe_int(incident.get("home_id")) or _get_young_person_home_id(conn, young_person_id)
    severity = str(incident.get("severity") or "").lower()
    incident_type = str(incident.get("incident_type") or "incident").lower()
    tasks = []

    tasks.append(
        create_workflow_task(
            conn,
            title="Manager review required for incident",
            source="incident",
            home_id=home_id,
            young_person_id=young_person_id,
            due_in_hours=24,
            priority="high" if severity in {"high", "critical"} else "normal",
        )
    )

    if incident.get("body_map_required") or incident.get("physical_intervention_used"):
        tasks.append(
            create_workflow_task(
                conn,
                title="Complete body map and physical intervention follow-up",
                source="incident_body_map",
                home_id=home_id,
                young_person_id=young_person_id,
                due_in_hours=12,
                priority="high",
            )
        )

    if "missing" in incident_type:
        tasks.append(
            create_workflow_task(
                conn,
                title="Arrange return home interview and missing from care review",
                source="missing_episode",
                home_id=home_id,
                young_person_id=young_person_id,
                due_in_hours=24,
                priority="high",
            )
        )

    if incident.get("external_notification_required"):
        tasks.append(
            create_workflow_task(
                conn,
                title="Complete external notification and evidence upload",
                source="external_notification",
                home_id=home_id,
                young_person_id=young_person_id,
                due_in_hours=12,
                priority="high",
            )
        )

    conn.commit()
    return [task for task in tasks if task]


def trigger_after_risk_updated(
    conn,
    *,
    young_person_id: int,
    risk: dict[str, Any],
    actor_user_id: int | None = None,
) -> dict[str, Any] | None:
    home_id = _safe_int(risk.get("home_id")) or _get_young_person_home_id(conn, young_person_id)
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
    )
    conn.commit()
    return task


def trigger_compliance_tasks_for_young_person(
    conn,
    *,
    young_person_id: int,
) -> list[dict[str, Any]]:
    home_id = _get_young_person_home_id(conn, young_person_id)
    created = []

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT * FROM (
                SELECT 'support_plan_review' AS source, COALESCE(title, plan_type, 'Plan review') AS title, review_date AS due_date
                FROM support_plans
                WHERE young_person_id = %s AND review_date IS NOT NULL AND COALESCE(archived, FALSE) = FALSE
                UNION ALL
                SELECT 'risk_review' AS source, COALESCE(title, category, 'Risk review') AS title, review_date AS due_date
                FROM risk_assessments
                WHERE young_person_id = %s AND review_date IS NOT NULL AND COALESCE(archived, FALSE) = FALSE
                UNION ALL
                SELECT 'statutory_document_review' AS source, COALESCE(title, document_type, 'Statutory document') AS title, COALESCE(review_date, expiry_date) AS due_date
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
        created.append(
            create_workflow_task(
                conn,
                title=f"Compliance due: {row.get('title')}",
                source=row.get("source") or "compliance",
                home_id=home_id,
                young_person_id=young_person_id,
                due_in_hours=24,
                priority="high",
            )
        )

    conn.commit()
    return [task for task in created if task]
