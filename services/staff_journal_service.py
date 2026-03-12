from sqlalchemy.orm import Session
from models.staff_journal import StaffJournal


def create_journal(db: Session, data: dict):
    journal = StaffJournal(**data)
    db.add(journal)
    db.commit()
    db.refresh(journal)
    return journal


def get_journal(db: Session, journal_id: int):
    return db.query(StaffJournal).filter(StaffJournal.id == journal_id).first()


def get_latest_for_staff(db: Session, staff_id: int):
    return (
        db.query(StaffJournal)
        .filter(StaffJournal.staff_id == staff_id)
        .order_by(StaffJournal.created_at.desc())
        .first()
    )


def update_journal(db: Session, journal: StaffJournal, data: dict):

    for key, value in data.items():
        setattr(journal, key, value)

    db.commit()
    db.refresh(journal)
    return journal
