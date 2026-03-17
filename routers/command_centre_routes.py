from datetime import datetime
from fastapi import APIRouter

router = APIRouter(prefix="/command-centre", tags=["Command Centre"])


@router.get("")
def get_command_centre():
    now = datetime.utcnow().isoformat()

    return {
        "generated_at": now,
        "summary": {
            "children_in_home": 4,
            "staff_on_shift": 3,
            "high_risk_alerts": 2,
            "open_incidents": 1,
            "manager_reviews_due": 3,
            "plans_overdue": 2,
            "medication_due_this_shift": 4,
        },
        "alerts": [
            {
                "id": "alert-1",
                "level": "high",
                "title": "Missing from home workflow open",
                "young_person_name": "Child A",
                "detail": "Return home interview reminder due by 10:00.",
            },
            {
                "id": "alert-2",
                "level": "medium",
                "title": "Risk plan review overdue",
                "young_person_name": "Child B",
                "detail": "Self-harm risk plan overdue for review.",
            },
        ],
        "tasks": [
            {
                "id": "task-1",
                "title": "Complete health appointment note",
                "young_person_name": "Child C",
                "due": "Today",
            },
            {
                "id": "task-2",
                "title": "Manager review incident 2026-0317-01",
                "young_person_name": "Child A",
                "due": "Now",
            },
        ],
        "meds_due": [
            {
                "id": "med-1",
                "young_person_name": "Child D",
                "medicine": "Melatonin",
                "time_due": "21:00",
                "status": "due",
            },
            {
                "id": "med-2",
                "young_person_name": "Child B",
                "medicine": "PRN inhaler",
                "time_due": "As required",
                "status": "available",
            },
        ],
        "handover": {
            "title": "Current shift handover",
            "summary": "One young person unsettled after contact. One open missing workflow follow-up. Two medication administrations due before 22:00.",
            "updated_at": now,
        },
        "overdue": [
            {
                "id": "overdue-1",
                "type": "plan_review",
                "title": "Safer care plan overdue",
                "young_person_name": "Child B",
            },
            {
                "id": "overdue-2",
                "type": "manager_review",
                "title": "Incident awaiting sign-off",
                "young_person_name": "Child A",
            },
        ],
    }
