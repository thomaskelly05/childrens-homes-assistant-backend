from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from models.staff_journal import StaffJournal
from schemas.staff_journal import StaffJournalCreate, StaffJournalUpdate

router = APIRouter(
    prefix="/staff-journal",
    tags=["Staff Journal"]
)


@router.post("/")
def create_staff_journal(payload: StaffJournalCreate, db: Session = Depends(get_db)):
    journal = StaffJournal(**payload.model_dump())
    db.add(journal)
    db.commit()
    db.refresh(journal)
    return journal


@router.get("/{journal_id}")
def get_staff_journal(journal_id: int, db: Session = Depends(get_db)):
    journal = db.query(StaffJournal).filter(StaffJournal.id == journal_id).first()

    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")

    return journal


@router.get("/staff/{staff_id}/latest")
def get_latest_journal(staff_id: int, db: Session = Depends(get_db)):
    journal = (
        db.query(StaffJournal)
        .filter(StaffJournal.staff_id == staff_id)
        .order_by(StaffJournal.created_at.desc())
        .first()
    )

    if not journal:
        raise HTTPException(status_code=404, detail="No journal found")

    return journal


@router.put("/{journal_id}")
def update_staff_journal(
    journal_id: int,
    payload: StaffJournalUpdate,
    db: Session = Depends(get_db),
):
    journal = db.query(StaffJournal).filter(StaffJournal.id == journal_id).first()

    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")

    update_data = payload.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(journal, key, value)

    db.commit()
    db.refresh(journal)
    return journal
