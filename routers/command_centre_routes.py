from datetime import datetime
from fastapi import APIRouter, Depends

from db.connection import get_db

router = APIRouter(prefix="/command-centre", tags=["Command Centre"])


def now_utc():
    return datetime.utcnow().isoformat()


def try_fetchone(cur, query: str, params=()):
    try:
        cur.execute(query, params)
        return cur.fetchone()
    except Exception:
        return None


def try_fetchall(cur, query: str, params=()):
    try:
        cur.execute(query, params)
        return cur.fetchall() or []
    except Exception:
        return []


def scalar(cur, query: str, params=(), default=0):
    row = try_fetchone(cur, query, params)
    if not row:
        return default
    first_value = next(iter(row.values()), default)
    return first_value if first_value is not None else default


@router.get("")
def get_command_centre(conn=Depends(get_db)):
    now = now_utc()

    with conn.cursor() as cur:
        children_in_home = scalar(
            cur,
            """
            SELECT COUNT(*) AS count
            FROM young_people
            WHERE COALESCE(archived, FALSE) = FALSE
              AND LOWER(COALESCE(placement_status, 'active')) NOT IN ('discharged', 'archived')
            """,
        )

        high_risk_alerts = scalar(
            cur,
            """
            SELECT COUNT(*) AS count
            FROM young_people
            WHERE COALESCE(archived, FALSE) = FALSE
              AND LOWER(COALESCE(summary_risk_level, '')) IN ('high', 'critical')
            """,
        )

        open_incidents = scalar(
            cur,
            """
            SELECT COUNT(*) AS count
            FROM incidents
            WHERE COALESCE(archived, FALSE) = FALSE
              AND LOWER(COALESCE(manager_review_status, 'pending')) NOT IN ('reviewed', 'closed', 'archived')
            """,
        )

        manager_reviews_due = scalar(
            cur,
            """
            SELECT COUNT(*) AS count
            FROM support_plans
            WHERE COALESCE(archived, FALSE) = FALSE
              AND LOWER(COALESCE(approval_status, 'draft')) IN ('submitted', 'returned')
            """,
        ) + scalar(
            cur,
            """
            SELECT COUNT(*) AS count
            FROM incidents
            WHERE COALESCE(archived, FALSE) = FALSE
              AND LOWER(COALESCE(manager_review_status, 'pending')) IN ('pending', 'returned')
            """,
        )

        plans_overdue = scalar(
            cur,
            """
            SELECT COUNT(*) AS count
            FROM support_plans
            WHERE COALESCE(archived, FALSE) = FALSE
              AND review_date IS NOT NULL
              AND review_date < CURRENT_DATE
              AND LOWER(COALESCE(status, 'draft')) NOT IN ('archived', 'completed')
            """,
        )

        medication_due_this_shift = 0
        meds_due_rows = []

        medication_queries = [
            """
            SELECT
                mar.id,
                yp.first_name,
                yp.last_name,
                COALESCE(mar.medicine_name, mar.medication_name, 'Medication') AS medicine,
                COALESCE(TO_CHAR(mar.time_due, 'HH24:MI'), 'As required') AS time_due,
                COALESCE(mar.status, 'due') AS status
            FROM medication_administration_records mar
            LEFT JOIN young_people yp ON mar.young_person_id = yp.id
            WHERE COALESCE(mar.is_due, TRUE) = TRUE
            ORDER BY mar.time_due NULLS LAST, mar.id DESC
            LIMIT 6
            """,
            """
            SELECT
                mr.id,
                yp.first_name,
                yp.last_name,
                COALESCE(mr.medicine_name, 'Medication') AS medicine,
                COALESCE(TO_CHAR(mr.time_due, 'HH24:MI'), 'As required') AS time_due,
                COALESCE(mr.status, 'due') AS status
            FROM medication_records mr
            LEFT JOIN young_people yp ON mr.young_person_id = yp.id
            WHERE LOWER(COALESCE(mr.status, 'due')) IN ('due', 'available', 'pending')
            ORDER BY mr.time_due NULLS LAST, mr.id DESC
            LIMIT 6
            """
        ]

        for query in medication_queries:
            rows = try_fetchall(cur, query)
            if rows:
                meds_due_rows = rows
                break

        medication_due_this_shift = len(meds_due_rows)

        alerts = []

        high_risk_rows = try_fetchall(
            cur,
            """
            SELECT
                yp.id,
                yp.first_name,
                yp.last_name,
                yp.summary_risk_level
            FROM young_people yp
            WHERE COALESCE(yp.archived, FALSE) = FALSE
              AND LOWER(COALESCE(yp.summary_risk_level, '')) IN ('high', 'critical')
            ORDER BY yp.updated_at DESC NULLS LAST, yp.id DESC
            LIMIT 5
            """,
        )

        for row in high_risk_rows:
            alerts.append({
                "id": f"risk-{row['id']}",
                "level": "high",
                "title": "High-risk young person identified",
                "young_person_name": f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Young person",
                "detail": f"Current recorded risk level is {row.get('summary_risk_level', 'high')}.",
            })

        overdue_plan_rows = try_fetchall(
            cur,
            """
            SELECT
                sp.id,
                sp.title,
                yp.first_name,
                yp.last_name,
                sp.review_date
            FROM support_plans sp
            LEFT JOIN young_people yp ON sp.young_person_id = yp.id
            WHERE COALESCE(sp.archived, FALSE) = FALSE
              AND sp.review_date IS NOT NULL
              AND sp.review_date < CURRENT_DATE
              AND LOWER(COALESCE(sp.status, 'draft')) NOT IN ('archived', 'completed')
            ORDER BY sp.review_date ASC
            LIMIT 5
            """,
        )

        for row in overdue_plan_rows:
            alerts.append({
                "id": f"plan-{row['id']}",
                "level": "medium",
                "title": "Plan review overdue",
                "young_person_name": f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Young person",
                "detail": f"{row.get('title', 'Plan')} review is overdue.",
            })

        open_incident_rows = try_fetchall(
            cur,
            """
            SELECT
                i.id,
                i.incident_type,
                yp.first_name,
                yp.last_name
            FROM incidents i
            LEFT JOIN young_people yp ON i.young_person_id = yp.id
            WHERE COALESCE(i.archived, FALSE) = FALSE
              AND LOWER(COALESCE(i.manager_review_status, 'pending')) IN ('pending', 'returned')
            ORDER BY i.incident_datetime DESC NULLS LAST, i.id DESC
            LIMIT 5
            """,
        )

        tasks = []
        for row in open_incident_rows:
            tasks.append({
                "id": f"incident-review-{row['id']}",
                "title": f"Manager review {str(row.get('incident_type') or 'incident').replace('_', ' ')}",
                "young_person_name": f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Young person",
                "due": "Now",
            })

        overdue_plan_task_rows = try_fetchall(
            cur,
            """
            SELECT
                sp.id,
                sp.title,
                yp.first_name,
                yp.last_name
            FROM support_plans sp
            LEFT JOIN young_people yp ON sp.young_person_id = yp.id
            WHERE COALESCE(sp.archived, FALSE) = FALSE
              AND sp.review_date IS NOT NULL
              AND sp.review_date < CURRENT_DATE
              AND LOWER(COALESCE(sp.status, 'draft')) NOT IN ('archived', 'completed')
            ORDER BY sp.review_date ASC
            LIMIT 5
            """,
        )

        for row in overdue_plan_task_rows:
            tasks.append({
                "id": f"plan-review-{row['id']}",
                "title": f"Review {row.get('title', 'plan')}",
                "young_person_name": f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Young person",
                "due": "Today",
            })

        handover_rows = try_fetchall(
            cur,
            """
            SELECT
                h.id,
                COALESCE(TO_CHAR(h.created_at, 'HH24:MI'), '—') AS time_label,
                COALESCE(h.title, 'Handover note') AS title,
                COALESCE(h.summary, h.notes, 'No detail recorded.') AS detail
            FROM handover_entries h
            ORDER BY h.created_at DESC
            LIMIT 5
            """,
        )

        handover = [
            {
                "id": f"handover-{row['id']}",
                "time": row.get("time_label") or "—",
                "title": row.get("title") or "Handover item",
                "detail": row.get("detail") or "No detail recorded.",
            }
            for row in handover_rows
        ]

        meds_due = [
            {
                "id": f"med-{row['id']}",
                "young_person_name": f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Young person",
                "item": row.get("medicine") or "Medication",
                "medicine": row.get("medicine") or "Medication",
                "time_due": row.get("time_due") or "As required",
                "status": row.get("status") or "due",
            }
            for row in meds_due_rows
        ]

        overdue = []
        for row in overdue_plan_rows:
            overdue.append({
                "id": f"overdue-plan-{row['id']}",
                "type": "plan_review",
                "title": row.get("title") or "Plan review overdue",
                "young_person_name": f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Young person",
            })

        for row in open_incident_rows:
            overdue.append({
                "id": f"overdue-incident-{row['id']}",
                "type": "manager_review",
                "title": f"Incident awaiting sign-off: {str(row.get('incident_type') or 'incident').replace('_', ' ')}",
                "young_person_name": f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or "Young person",
            })

    return {
        "generated_at": now,
        "summary": {
            "children_in_home": children_in_home,
            "staff_on_shift": 0,
            "high_risk_alerts": high_risk_alerts,
            "open_incidents": open_incidents,
            "open_safeguarding_items": open_incidents,
            "manager_reviews_due": manager_reviews_due,
            "overdue_reviews": manager_reviews_due,
            "plans_overdue": plans_overdue,
            "documents_due": plans_overdue,
            "medication_due_this_shift": medication_due_this_shift,
        },
        "alerts": alerts[:6],
        "tasks": tasks[:6],
        "meds_due": meds_due[:6],
        "handover": handover,
        "overdue": overdue[:10],
    }
}
