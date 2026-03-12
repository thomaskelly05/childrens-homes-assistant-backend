from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from db.connection import get_db
from models.staff_journal import StaffJournal
from schemas.staff_journal import (
    StaffJournalCreate,
    StaffJournalUpdate
)

router = APIRouter(
    prefix="/staff-journal",
    tags=["Staff Journal"]
)


# --------------------------------------------------
# CREATE JOURNAL
# --------------------------------------------------

@router.post("/")
async def create_staff_journal(
    payload: StaffJournalCreate,
    db: Session = Depends(get_db)
):
    try:
        journal = StaffJournal(**payload.model_dump())

        db.add(journal)
        db.commit()
        db.refresh(journal)

        return {
            "ok": True,
            "journal": journal
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not create journal: {str(e)}"
        )


# --------------------------------------------------
# GET ONE JOURNAL
# --------------------------------------------------

@router.get("/{journal_id}")
async def get_staff_journal(
    journal_id: int,
    db: Session = Depends(get_db)
):
    try:
        journal = (
            db.query(StaffJournal)
            .filter(StaffJournal.id == journal_id)
            .first()
        )

        if not journal:
            raise HTTPException(
                status_code=404,
                detail="Journal not found"
            )

        return {
            "ok": True,
            "journal": journal
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load journal: {str(e)}"
        )


# --------------------------------------------------
# GET LATEST JOURNAL FOR STAFF
# --------------------------------------------------

@router.get("/staff/{staff_id}/latest")
async def get_latest_staff_journal(
    staff_id: int,
    db: Session = Depends(get_db)
):
    try:
        journal = (
            db.query(StaffJournal)
            .filter(StaffJournal.staff_id == staff_id)
            .order_by(StaffJournal.created_at.desc())
            .first()
        )

        if not journal:
            raise HTTPException(
                status_code=404,
                detail="No journal found for this staff member"
            )

        return {
            "ok": True,
            "journal": journal
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load latest journal: {str(e)}"
        )


# --------------------------------------------------
# UPDATE JOURNAL
# --------------------------------------------------

@router.put("/{journal_id}")
async def update_staff_journal(
    journal_id: int,
    payload: StaffJournalUpdate,
    db: Session = Depends(get_db)
):
    try:
        journal = (
            db.query(StaffJournal)
            .filter(StaffJournal.id == journal_id)
            .first()
        )

        if not journal:
            raise HTTPException(
                status_code=404,
                detail="Journal not found"
            )

        update_data = payload.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(journal, key, value)

        db.commit()
        db.refresh(journal)

        return {
            "ok": True,
            "journal": journal
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not update journal: {str(e)}"
        )
