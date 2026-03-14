from datetime import date, timedelta

from fastapi import APIRouter, Depends

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Compliance"])


def status_from_date(target_date):
    if not target_date:
        return "no_due_date"

    today = date.today()

    if target_date < today:
        return "overdue"
    if target_date == today:
        return "due_today"
    if target_date <= today + timedelta(days=7):
        return "due_soon"
    return "upcoming"


@router.get("/{young_person_id}/compliance")
def get_young_person_compliance(
    young_person_id: int,
    conn=Depends(get_db),
):
    items = []

    with conn.cursor() as cur:
        # Support plans
        cur.execute(
            """
            SELECT id, title, review_date, status
            FROM support_plans
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY review_date ASC NULLS LAST
            """,
            (young_person_id,),
        )
        for row in cur.fetchall():
            items.append({
                "section": "plans",
                "record_type": "Support Plan Review",
                "record_id": row["id"],
                "title": row["title"],
                "due_date": row["review_date"],
                "status": status_from_date(row["review_date"]),
                "notes": row["status"],
            })

        # Risks
        cur.execute(
            """
            SELECT id, title, review_date, status
            FROM risk_assessments
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY review_date ASC NULLS LAST
            """,
            (young_person_id,),
        )
        for row in cur.fetchall():
            items.append({
                "section": "risk",
                "record_type": "Risk Review",
                "record_id": row["id"],
                "title": row["title"],
                "due_date": row["review_date"],
                "status": status_from_date(row["review_date"]),
                "notes": row["status"],
            })

        # Keywork
        cur.execute(
            """
            SELECT id, topic, next_session_date
            FROM keywork_sessions
            WHERE young_person_id = %s
            ORDER BY next_session_date ASC NULLS LAST, id DESC
            """,
            (young_person_id,),
        )
        for row in cur.fetchall():
            items.append({
                "section": "keywork",
                "record_type": "Key Work Session Due",
                "record_id": row["id"],
                "title": row["topic"],
                "due_date": row["next_session_date"],
                "status": status_from_date(row["next_session_date"]),
                "notes": None,
            })

        # Health follow up
        cur.execute(
            """
            SELECT id, title, next_action_date, follow_up_required
            FROM health_records
            WHERE young_person_id = %s
              AND COALESCE(follow_up_required, FALSE) = TRUE
            ORDER BY next_action_date ASC NULLS LAST
            """,
            (young_person_id,),
        )
        for row in cur.fetchall():
            items.append({
                "section": "health",
                "record_type": "Health Follow-up",
                "record_id": row["id"],
                "title": row["title"],
                "due_date": row["next_action_date"],
                "status": status_from_date(row["next_action_date"]),
                "notes": "Follow-up required",
            })

        # Family follow up
        cur.execute(
            """
            SELECT id, contact_person, contact_datetime, follow_up_required
            FROM family_contact_records
            WHERE young_person_id = %s
              AND COALESCE(follow_up_required, FALSE) = TRUE
            ORDER BY contact_datetime DESC
            """,
            (young_person_id,),
        )
        for row in cur.fetchall():
            items.append({
                "section": "family",
                "record_type": "Family Follow-up",
                "record_id": row["id"],
                "title": row["contact_person"],
                "due_date": row["contact_datetime"].date() if row["contact_datetime"] else None,
                "status": status_from_date(row["contact_datetime"].date()) if row["contact_datetime"] else "no_due_date",
                "notes": "Follow-up required after contact",
            })

        # Incidents manager review
        cur.execute(
            """
            SELECT id, incident_type, incident_datetime, manager_review_status, follow_up_required
            FROM incidents
            WHERE young_person_id = %s
              AND (
                COALESCE(manager_review_required, FALSE) = TRUE
                OR COALESCE(follow_up_required, FALSE) = TRUE
              )
            ORDER BY incident_datetime DESC NULLS LAST, id DESC
            """,
            (young_person_id,),
        )
        for row in cur.fetchall():
            due_date = row["incident_datetime"].date() if row["incident_datetime"] else None
            status = "completed" if row["manager_review_status"] == "completed" else status_from_date(due_date) if due_date else "no_due_date"
            items.append({
                "section": "incidents",
                "record_type": "Incident Review",
                "record_id": row["id"],
                "title": row["incident_type"],
                "due_date": due_date,
                "status": status,
                "notes": row["manager_review_status"],
            })

        # Medication errors
        cur.execute(
            """
            SELECT id, medication_name, scheduled_time, manager_review_status, error_flag
            FROM medication_records
            WHERE young_person_id = %s
              AND COALESCE(error_flag, FALSE) = TRUE
            ORDER BY scheduled_time DESC
            """,
            (young_person_id,),
        )
        for row in cur.fetchall():
            due_date = row["scheduled_time"].date() if row["scheduled_time"] else None
            status = "completed" if row["manager_review_status"] == "completed" else status_from_date(due_date) if due_date else "no_due_date"
            items.append({
                "section": "medication",
                "record_type": "Medication Error Review",
                "record_id": row["id"],
                "title": row["medication_name"],
                "due_date": due_date,
                "status": status,
                "notes": row["manager_review_status"],
            })

    summary = {
        "overdue": len([i for i in items if i["status"] == "overdue"]),
        "due_today": len([i for i in items if i["status"] == "due_today"]),
        "due_soon": len([i for i in items if i["status"] == "due_soon"]),
        "completed": len([i for i in items if i["status"] == "completed"]),
        "no_due_date": len([i for i in items if i["status"] == "no_due_date"]),
        "total": len(items),
    }

    return {
        "summary": summary,
        "items": items,
    }
