from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/workflow-reviews", tags=["Workflow Reviews"])

REVIEWS = [
    {
        "id": 1,
        "record_type": "plan",
        "record_id": 1,
        "young_person_name": "Amelia Hart",
        "status": "awaiting_review",
        "decision": None,
        "review_note": "",
        "child_voice_captured": False,
        "trauma_informed": False,
        "actions_required": False,
        "requires_external_notification": False,
        "submitted_at": "2026-03-17T09:00:00",
        "reviewed_at": None,
    }
]


class ReviewDecision(BaseModel):
    decision: str
    review_note: str = ""
    child_voice_captured: bool = False
    trauma_informed: bool = False
    actions_required: bool = False
    requires_external_notification: bool = False


def now_utc():
    return datetime.utcnow().isoformat()


@router.get("")
def list_reviews():
    return {"items": REVIEWS}


@router.get("/{review_id}")
def get_review(review_id: int):
    row = next((r for r in REVIEWS if r["id"] == review_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    return row


@router.post("/{review_id}/decision")
def decide_review(review_id: int, payload: ReviewDecision):
    row = next((r for r in REVIEWS if r["id"] == review_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")

    row["decision"] = payload.decision
    row["status"] = payload.decision
    row["review_note"] = payload.review_note
    row["child_voice_captured"] = payload.child_voice_captured
    row["trauma_informed"] = payload.trauma_informed
    row["actions_required"] = payload.actions_required
    row["requires_external_notification"] = payload.requires_external_notification
    row["reviewed_at"] = now_utc()
    return row
