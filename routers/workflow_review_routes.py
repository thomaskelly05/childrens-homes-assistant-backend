from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/workflow", tags=["Workflow Reviews"])

REVIEWS_DB = []


class ReviewPayload(BaseModel):
    record_type: str
    record_id: int
    decision: str
    review_note: str = ""
    child_voice_captured: bool = False
    trauma_informed: bool = False
    actions_required: bool = False
    requires_external_notification: bool = False
    reviewer_name: str = "Manager"


@router.get("/queue")
def get_review_queue():
    return {
        "items": [
            {
                "record_type": "event",
                "record_id": 2,
                "title": "Verbal aggression after phone call",
                "young_person_name": "Child A",
                "priority": "high",
                "status": "awaiting_review",
            },
            {
                "record_type": "plan",
                "record_id": 101,
                "title": "Safer care plan",
                "young_person_name": "Child B",
                "priority": "medium",
                "status": "overdue_review",
            },
        ]
    }


@router.post("/review")
def submit_review(payload: ReviewPayload):
    row = payload.dict()
    row["id"] = len(REVIEWS_DB) + 1
    row["created_at"] = datetime.utcnow().isoformat()
    REVIEWS_DB.append(row)
    return row
