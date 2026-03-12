from fastapi import APIRouter, HTTPException, Depends

from db.connection import get_db
from db.staff_journal_db import (
    ensure_staff_journal_table,
    create_staff_journal,
    get_staff_journal,
    get_latest_staff_journal,
    update_staff_journal,
)
from schemas.staff_journal import (
    StaffJournalCreate,
    StaffJournalUpdate,
)

router = APIRouter(
    prefix="/staff-journal",
    tags=["Staff Journal"]
)


# --------------------------------------------------
# CREATE JOURNAL
# --------------------------------------------------

@router.post("/")
async def create_staff_journal_route(
    payload: StaffJournalCreate,
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)

        journal = create_staff_journal(conn, payload.model_dump())

        return {
            "ok": True,
            "journal": journal
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not create journal: {str(e)}"
        )


# --------------------------------------------------
# GET ONE JOURNAL
# --------------------------------------------------

@router.get("/{journal_id}")
async def get_staff_journal_route(
    journal_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)

        journal = get_staff_journal(conn, journal_id)

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
async def get_latest_staff_journal_route(
    staff_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)

        journal = get_latest_staff_journal(conn, staff_id)

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
async def update_staff_journal_route(
    journal_id: int,
    payload: StaffJournalUpdate,
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)

        existing = get_staff_journal(conn, journal_id)

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Journal not found"
            )

        update_data = payload.model_dump(exclude_unset=True)
        journal = update_staff_journal(conn, journal_id, update_data)

        return {
            "ok": True,
            "journal": journal
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not update journal: {str(e)}"
        )
