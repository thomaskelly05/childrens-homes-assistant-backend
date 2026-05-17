from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth.current_user import get_current_user
from services.os_sync_hooks import sync_after_save

router = APIRouter(prefix="/staff", tags=["Staff Evidence"])


class StaffEvidencePayload(BaseModel):
    staff_id: int | None = None
    evidence_type: str = "supervision"
    title: str | None = None
    summary: str | None = None
    notes: str | None = None
    outcome: str | None = None
    training_name: str | None = None
    competency_area: str | None = None
    review_note: str | None = None
    review_date: str | None = None
    status: str | None = "recorded"


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


@router.post("/evidence")
def create_staff_evidence(payload: StaffEvidencePayload, current_user=Depends(get_current_user)):
    table = {
        "supervision": "staff_supervisions",
        "training": "staff_training_matrix",
        "probation": "staff_probation_reviews",
        "profile": "staff_profile",
    }.get(payload.evidence_type, "staff_supervisions")
    actor_id = _safe_int(current_user.get("user_id") or current_user.get("id")) if isinstance(current_user, dict) else None
    home_id = _safe_int(current_user.get("home_id")) if isinstance(current_user, dict) else None
    staff_id = payload.staff_id or actor_id
    record_id = int(datetime.utcnow().timestamp() * 1000)
    record = {
        "id": record_id,
        "staff_id": staff_id,
        "home_id": home_id,
        "title": payload.title or payload.training_name or "Staff evidence",
        "summary": payload.summary or payload.notes or payload.review_note or payload.title or "Staff evidence recorded",
        "notes": payload.notes,
        "outcome": payload.outcome,
        "training_name": payload.training_name,
        "competency_area": payload.competency_area,
        "review_note": payload.review_note,
        "review_date": payload.review_date,
        "status": payload.status or "recorded",
        "created_by": actor_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    linked = sync_after_save(source_table=table, record=record, recorded_by_name=(current_user.get("full_name") if isinstance(current_user, dict) else None))
    return {"ok": True, "source_table": table, "evidence": record, "linked": linked}
