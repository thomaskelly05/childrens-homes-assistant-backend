from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Compliance"])


def get_compliance_status(due_date):
    if due_date is None:
        return "ok"

    if isinstance(due_date, datetime):
        due_date = due_date.date()

    today = date.today()

    if due_date < today:
        return "overdue"

    if due_date <= today + timedelta(days=7):
        return "due_soon"

    return "ok"


@router.get("/{young_person_id}/compliance")
def get_young_person_compliance(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, first_name, last_name
                FROM young_people
                WHERE id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            young_person = cur.fetchone()

            if not young_person:
                raise HTTPException(status_code=404, detail="Young person not found")

            compliance_items = []

            # Support plan reviews
            cur.execute(
                """
                SELECT
                    sp.id,
                    sp.plan_type,
                    sp.title,
                    sp.review_date AS due_date,
                    sp.status,
                    sp.approval_status,
                    sp.created_at,
                    sp.updated_at,
                    sp.owner_id,
                    u.first_name AS owner_first_name,
                    u.last_name AS owner_last_name
                FROM support_plans sp
                LEFT JOIN users u
                    ON sp.owner_id = u.id
                WHERE sp.young_person_id = %s
                  AND COALESCE(sp.archived, FALSE) = FALSE
                ORDER BY sp.review_date ASC NULLS LAST, sp.id DESC
                """,
                (young_person_id,),
            )
            plan_rows = cur.fetchall()

            for row in plan_rows:
                due_date = row.get("due_date")
                compliance_items.append({
                    "compliance_type": "support_plan_review",
                    "id": row["id"],
                    "title": row.get("title") or row.get("plan_type") or "Support plan review",
                    "due_date": due_date,
                    "status": row.get("status"),
                    "approval_status": row.get("approval_status"),
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at"),
                    "owner_id": row.get("owner_id"),
                    "owner_first_name": row.get("owner_first_name"),
                    "owner_last_name": row.get("owner_last_name"),
                    "compliance_status": get_compliance_status(due_date),
                    "source_table": "support_plans",
                    "source_id": row["id"],
                })

            # Risk reviews
            cur.execute(
                """
                SELECT
                    ra.id,
                    ra.category,
                    ra.title,
                    ra.review_date AS due_date,
                    ra.status,
                    ra.approval_status,
                    ra.created_at,
                    ra.updated_at,
                    ra.owner_id,
                    u.first_name AS owner_first_name,
                    u.last_name AS owner_last_name
                FROM risk_assessments ra
                LEFT JOIN users u
                    ON ra.owner_id = u.id
                WHERE ra.young_person_id = %s
                  AND COALESCE(ra.archived, FALSE) = FALSE
                ORDER BY ra.review_date ASC NULLS LAST, ra.id DESC
                """,
                (young_person_id,),
            )
            risk_rows = cur.fetchall()

            for row in risk_rows:
                due_date = row.get("due_date")
                compliance_items.append({
                    "compliance_type": "risk_review",
                    "id": row["id"],
                    "title": row.get("title") or row.get("category") or "Risk review",
                    "due_date": due_date,
                    "status": row.get("status"),
                    "approval_status": row.get("approval_status"),
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at"),
                    "owner_id": row.get("owner_id"),
                    "owner_first_name": row.get("owner_first_name"),
                    "owner_last_name": row.get("owner_last_name"),
                    "compliance_status": get_compliance_status(due_date),
                    "source_table": "risk_assessments",
                    "source_id": row["id"],
                })

            # Key work follow-up
            cur.execute(
                """
                SELECT
                    ks.id,
                    ks.topic,
                    ks.session_date,
                    ks.next_session_date AS due_date,
                    ks.created_at,
                    ks.updated_at,
                    ks.worker_id,
                    u.first_name AS worker_first_name,
                    u.last_name AS worker_last_name
                FROM keywork_sessions ks
                LEFT JOIN users u
                    ON ks.worker_id = u.id
                WHERE ks.young_person_id = %s
                ORDER BY ks.next_session_date ASC NULLS LAST, ks.id DESC
                """,
                (young_person_id,),
            )
            keywork_rows = cur.fetchall()

            for row in keywork_rows:
                due_date = row.get("due_date")
                compliance_items.append({
                    "compliance_type": "keywork_follow_up",
                    "id": row["id"],
                    "title": row.get("topic") or "Key work follow-up",
                    "due_date": due_date,
                    "status": None,
                    "approval_status": None,
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at"),
                    "worker_id": row.get("worker_id"),
                    "worker_first_name": row.get("worker_first_name"),
                    "worker_last_name": row.get("worker_last_name"),
                    "session_date": row.get("session_date"),
                    "compliance_status": get_compliance_status(due_date),
                    "source_table": "keywork_sessions",
                    "source_id": row["id"],
                })

            # Health follow-up
            cur.execute(
                """
                SELECT
                    hr.id,
                    hr.title,
                    hr.record_type,
                    hr.next_action_date AS due_date,
                    hr.follow_up_required,
                    hr.created_at,
                    hr.updated_at,
                    hr.created_by,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM health_records hr
                LEFT JOIN users u
                    ON hr.created_by = u.id
                WHERE hr.young_person_id = %s
                  AND COALESCE(hr.follow_up_required, FALSE) = TRUE
                ORDER BY hr.next_action_date ASC NULLS LAST, hr.id DESC
                """,
                (young_person_id,),
            )
            health_rows = cur.fetchall()

            for row in health_rows:
                due_date = row.get("due_date")
                compliance_items.append({
                    "compliance_type": "health_follow_up",
                    "id": row["id"],
                    "title": row.get("title") or row.get("record_type") or "Health follow-up",
                    "due_date": due_date,
                    "status": "follow_up_required",
                    "approval_status": None,
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at"),
                    "created_by": row.get("created_by"),
                    "created_by_first_name": row.get("created_by_first_name"),
                    "created_by_last_name": row.get("created_by_last_name"),
                    "compliance_status": get_compliance_status(due_date),
                    "source_table": "health_records",
                    "source_id": row["id"],
                })

            # Family follow-up
            cur.execute(
                """
                SELECT
                    fcr.id,
                    fcr.contact_person,
                    fcr.contact_type,
                    fcr.contact_datetime,
                    fcr.follow_up_required,
                    fcr.created_at,
                    fcr.updated_at,
                    fcr.created_by,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM family_contact_records fcr
                LEFT JOIN users u
                    ON fcr.created_by = u.id
                WHERE fcr.young_person_id = %s
                  AND COALESCE(fcr.follow_up_required, FALSE) = TRUE
                ORDER BY fcr.contact_datetime DESC, fcr.id DESC
                """,
                (young_person_id,),
            )
            family_rows = cur.fetchall()

            for row in family_rows:
                contact_dt = row.get("contact_datetime")
                due_date = None
                if contact_dt:
                    due_date = contact_dt.date() + timedelta(days=7) if isinstance(contact_dt, datetime) else contact_dt + timedelta(days=7)

                compliance_items.append({
                    "compliance_type": "family_follow_up",
                    "id": row["id"],
                    "title": row.get("contact_person") or row.get("contact_type") or "Family follow-up",
                    "due_date": due_date,
                    "status": "follow_up_required",
                    "approval_status": None,
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at"),
                    "created_by": row.get("created_by"),
                    "created_by_first_name": row.get("created_by_first_name"),
                    "created_by_last_name": row.get("created_by_last_name"),
                    "contact_datetime": contact_dt,
                    "compliance_status": get_compliance_status(due_date),
                    "source_table": "family_contact_records",
                    "source_id": row["id"],
                })

            # Active alerts
            cur.execute(
                """
                SELECT
                    a.*,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM young_person_alerts a
                LEFT JOIN users u
                    ON a.created_by = u.id
                WHERE a.young_person_id = %s
                  AND COALESCE(a.is_active, TRUE) = TRUE
                ORDER BY
                    CASE
                        WHEN LOWER(COALESCE(a.severity, '')) = 'high' THEN 1
                        WHEN LOWER(COALESCE(a.severity, '')) = 'medium' THEN 2
                        WHEN LOWER(COALESCE(a.severity, '')) = 'low' THEN 3
                        ELSE 4
                    END,
                    a.review_date ASC NULLS LAST,
                    a.id DESC
                """,
                (young_person_id,),
            )
            active_alerts = cur.fetchall()

        def sort_key(item):
            due_date = item.get("due_date")
            if due_date is None:
                return (1, date.max, item.get("id", 0))
            if isinstance(due_date, datetime):
                due_date = due_date.date()
            return (0, due_date, item.get("id", 0))

        compliance_items.sort(key=sort_key)

        summary = {
            "overdue_count": len([x for x in compliance_items if x["compliance_status"] == "overdue"]),
            "due_soon_count": len([x for x in compliance_items if x["compliance_status"] == "due_soon"]),
            "ok_count": len([x for x in compliance_items if x["compliance_status"] == "ok"]),
            "active_alert_count": len(active_alerts),
            "total_items": len(compliance_items),
        }

        return {
            "young_person": young_person,
            "summary": summary,
            "compliance_items": compliance_items,
            "active_alerts": active_alerts,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load compliance: {str(e)}")
