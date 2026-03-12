from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from models.staff_journal import StaffJournal
from services.staff_journal_service import (
    create_journal,
    get_journal,
    get_latest_for_staff,
    update_journal,
)

router = APIRouter(
    prefix="/staff-journal",
    tags=["Staff Journal"]
)


@router.post("/")
def create_staff_journal(payload: dict, db: Session = Depends(get_db)):
    return create_journal(db, payload)


@router.get("/{journal_id}")
def get_staff_journal(journal_id: int, db: Session = Depends(get_db)):

    journal = get_journal(db, journal_id)

    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")

    return journal


@router.get("/staff/{staff_id}/latest")
def get_latest_journal(staff_id: int, db: Session = Depends(get_db)):

    journal = get_latest_for_staff(db, staff_id)

    if not journal:
        raise HTTPException(status_code=404, detail="No journal found")

    return journal


@router.put("/{journal_id}")
def update_staff_journal(journal_id: int, payload: dict, db: Session = Depends(get_db)):

    journal = get_journal(db, journal_id)

    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")

    return update_journal(db, journal, payload)
