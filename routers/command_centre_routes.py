from datetime import datetime
from fastapi import APIRouter, Depends

from db.connection import get_db

router = APIRouter(prefix="/command-centre", tags=["Command Centre"])


def now_utc():
    return datetime.utcnow().isoformat()


@router.get("")
def get_command_centre(conn=Depends(get_db)):
    now = now_utc()

    return {
        "generated_at": now,
        "summary": {
            "children_in_home": 4,
            "staff_on_shift": 3,
            "high_risk_alerts": 2,
            "open_incidents": 1,
            "open_safeguarding_items": 1,
            "manager_reviews_due": 3,
            "overdue_reviews": 3,
            "plans_overdue": 2,
            "documents_due": 2,
            "medication_due_this_shift": 2,
        },
        "alerts": [
            {
                "id": "alert-1",
                "level": "high",
                "title": "Missing from home workflow open",
                "young_person_name": "Amelia Hart",
                "detail": "Return home interview reminder due by 10:00.",
            },
            {
                "id": "alert-2",
                "level": "medium",
                "title": "Risk plan review overdue",
                "young_person_name": "Amelia Hart",
                "detail": "Risk plan overdue for review.",
            },
        ],
        "tasks": [
            {
                "id": "task-1",
                "title": "Complete health appointment note",
                "young_person_name": "Amelia Hart",
                "due": "Today",
            },
            {
                "id": "task-2",
                "title": "Manager review incident",
                "young_person_name": "Amelia Hart",
                "due": "Now",
            },
        ],
        "meds_due": [
            {
                "id": "med-1",
                "young_person_name": "Amelia Hart",
                "item": "Melatonin",
                "medicine": "Melatonin",
                "time_due": "21:00",
                "status": "due",
            },
            {
                "id": "med-2",
                "young_person_name": "Amelia Hart",
                "item": "PRN inhaler",
                "medicine": "PRN inhaler",
                "time_due": "As required",
                "status": "available",
            },
        ],
        "handover": [
            {
                "id": "handover-1",
                "time": "20:15",
                "title": "Evening handover",
                "detail": "One young person unsettled after contact. Two medications due.",
            }
        ],
        "overdue": [
            {
                "id": "overdue-1",
                "type": "plan_review",
                "title": "Safer care plan overdue",
                "young_person_name": "Amelia Hart",
            }
        ],
    }
