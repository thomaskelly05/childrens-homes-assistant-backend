from fastapi import APIRouter, HTTPException, Depends, Query

from db.connection import get_db
from db.staff_journal_db import (
    ensure_staff_journal_table,
    create_staff_journal,
    get_staff_journal,
    get_latest_staff_journal,
    update_staff_journal,
    list_staff_journals,
)
from db.supervision_db import (
    ensure_supervision_table,
    create_supervision_submission,
)
from schemas.staff_journal import (
    StaffJournalCreate,
    StaffJournalUpdate,
)
from services.staff_development_service import (
    generate_staff_pdp,
    generate_supervision_pack,
    build_journal_summary,
)

router = APIRouter(
    prefix="/staff-journal",
    tags=["Staff Journal"]
)


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


@router.get("/staff/{staff_id}")
async def list_staff_journal_entries_route(
    staff_id: int,
    limit: int = Query(50, ge=1, le=100),
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)
        entries = list_staff_journals(conn, staff_id, limit=limit)

        return {
            "ok": True,
            "entries": entries
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load journal entries: {str(e)}"
        )


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


@router.delete("/{journal_id}")
async def delete_staff_journal_route(
    journal_id: int,
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

        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM staff_journal WHERE id = %s",
                (journal_id,)
            )
            conn.commit()

        return {
            "ok": True,
            "message": "Journal deleted"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete journal: {str(e)}"
        )


@router.get("/staff/{staff_id}/development-plan")
async def generate_development_plan_route(
    staff_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)
        entries = list_staff_journals(conn, staff_id, limit=20)

        if not entries:
            raise HTTPException(
                status_code=404,
                detail="No journal entries found"
            )

        plan = await generate_staff_pdp(entries)

        return {
            "ok": True,
            "development_plan": plan
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate development plan: {str(e)}"
        )


@router.get("/staff/{staff_id}/supervision-pack")
async def generate_supervision_pack_route(
    staff_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)
        entries = list_staff_journals(conn, staff_id, limit=20)

        if not entries:
            raise HTTPException(
                status_code=404,
                detail="No journal entries found"
            )

        pack = await generate_supervision_pack(entries)

        return {
            "ok": True,
            "supervision_pack": pack
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate supervision pack: {str(e)}"
        )


@router.post("/{journal_id}/submit-to-manager")
async def submit_to_manager_dashboard_route(
    journal_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_staff_journal_table(conn)
        ensure_supervision_table(conn)

        journal = get_staff_journal(conn, journal_id)
        if not journal:
            raise HTTPException(
                status_code=404,
                detail="Journal not found"
            )

        staff_id = journal.get("staff_id")
        entries = list_staff_journals(conn, staff_id, limit=20)

        journal_summary = build_journal_summary(journal)
        development_plan = await generate_staff_pdp(entries)
        supervision_pack = await generate_supervision_pack(entries)

        submission = create_supervision_submission(
            conn=conn,
            staff_id=staff_id,
            journal_id=journal_id,
            journal_summary=journal_summary,
            development_plan=development_plan,
            supervision_pack=supervision_pack
        )

        return {
            "ok": True,
            "message": "Submitted to manager dashboard",
            "submission": submission
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not submit to manager dashboard: {str(e)}"
        )
