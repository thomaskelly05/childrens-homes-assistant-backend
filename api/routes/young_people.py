from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.young_people import YoungPerson
from app.schemas.young_people import (
    YoungPersonCreate,
    YoungPersonRead,
    YoungPersonUpdate,
)

router = APIRouter(prefix="/young-people", tags=["Young People"])


@router.get("/", response_model=list[YoungPersonRead])
def list_young_people(
    home_id: int | None = Query(default=None),
    archived: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    query = db.query(YoungPerson).filter(YoungPerson.archived == archived)

    if home_id is not None:
        query = query.filter(YoungPerson.home_id == home_id)

    return query.order_by(YoungPerson.first_name.asc(), YoungPerson.last_name.asc()).all()


@router.get("/{young_person_id}", response_model=YoungPersonRead)
def get_young_person(
    young_person_id: int,
    db: Session = Depends(get_db),
):
    young_person = db.query(YoungPerson).filter(YoungPerson.id == young_person_id).first()
    if not young_person:
        raise HTTPException(status_code=404, detail="Young person not found")
    return young_person


@router.post("/", response_model=YoungPersonRead)
def create_young_person(
    payload: YoungPersonCreate,
    db: Session = Depends(get_db),
):
    young_person = YoungPerson(**payload.model_dump())
    db.add(young_person)
    db.commit()
    db.refresh(young_person)
    return young_person


@router.put("/{young_person_id}", response_model=YoungPersonRead)
def update_young_person(
    young_person_id: int,
    payload: YoungPersonUpdate,
    db: Session = Depends(get_db),
):
    young_person = db.query(YoungPerson).filter(YoungPerson.id == young_person_id).first()
    if not young_person:
        raise HTTPException(status_code=404, detail="Young person not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(young_person, field, value)

    db.commit()
    db.refresh(young_person)
    return young_person


@router.delete("/{young_person_id}")
def archive_young_person(
    young_person_id: int,
    db: Session = Depends(get_db),
):
    young_person = db.query(YoungPerson).filter(YoungPerson.id == young_person_id).first()
    if not young_person:
        raise HTTPException(status_code=404, detail="Young person not found")

    young_person.archived = True
    db.commit()

    return {"message": "Young person archived successfully"}
