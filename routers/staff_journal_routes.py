from fastapi import APIRouter, Depends
from pydantic import BaseModel
from db import get_db
from utils.auth import get_current_user
from models.staff_journal import StaffJournal

router = APIRouter(prefix="/staff/journal", tags=["Staff Journal"])

class JournalEntry(BaseModel):
    holding_today: str | None = None
    practice_today: str | None = None
    reflection_today: str | None = None

@router.get("", response_model=JournalEntry)
def get_journal(db=Depends(get_db), current_user=Depends(get_current_user)):
    entry = (
        db.query(StaffJournal)
        .filter(StaffJournal.staff_id == current_user.id)
        .order_by(StaffJournal.created_at.desc())
        .first()
    )
    if not entry:
        return JournalEntry()
    return JournalEntry(
        holding_today=entry.holding_today,
        practice_today=entry.practice_today,
        reflection_today=entry.reflection_today,
    )

@router.post("", response_model=JournalEntry)
def save_journal(payload: JournalEntry, db=Depends(get_db), current_user=Depends(get_current_user)):
    entry = StaffJournal(
        staff_id=current_user.id,
        holding_today=payload.holding_today,
        practice_today=payload.practice_today,
        reflection_today=payload.reflection_today,
    )
    db.add(entry)
    db.commit()
    return payload
