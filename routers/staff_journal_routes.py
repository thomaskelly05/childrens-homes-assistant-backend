from fastapi import APIRouter, HTTPException, Depends, Query

from auth.session_user import get_current_user
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


# --------------------------------------------------
# CREATE JOURNAL (uses logged-in user)
# --------------------------------------------------

@router.post("/")
async def create_staff_journal_route(
    payload: StaffJournalCreate,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_staff_journal_table(conn)

        data = payload.model_dump()
        data["staff_id"] = current_user["id"]

        journal = create_staff_journal(conn, data)

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
# CURRENT USER JOURNAL HISTORY
# --------------------------------------------------

@router.get("/me")
async def list_my_journal_entries_route(
    limit: int = Query(50, ge=1, le=100),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_staff_journal_table(conn)
        entries = list_staff_journals(conn, current_user["id"], limit=limit)

        return {
            "ok": True,
            "entries": entries,
            "user": current_user
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load journal entries: {str(e)}"
        )


# --------------------------------------------------
# CURRENT USER LATEST JOURNAL
# --------------------------------------------------

@router.get("/me/latest")
async def get_my_latest_journal_route(
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_staff_journal_table(conn)
        journal = get_latest_staff_journal(conn, current_user["id"])

        if not journal:
            raise HTTPException(
                status_code=404,
                detail="No journal found for this user"
            )

        return {
            "ok": True,
            "journal": journal,
            "user": current_user
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load latest journal: {str(e)}"
        )


# --------------------------------------------------
# CURRENT USER DEVELOPMENT PLAN
# --------------------------------------------------

@router.get("/me/development-plan")
async def generate_my_development_plan_route(
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_staff_journal_table(conn)
        entries = list_staff_journals(conn, current_user["id"], limit=20)

        if not entries:
            raise HTTPException(
                status_code=404,
                detail="No journal entries found"
            )

        plan = await generate_staff_pdp(entries)

        return {
            "ok": True,
            "development_plan": plan,
            "user": current_user
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate development plan: {str(e)}"
        )


# --------------------------------------------------
# CURRENT USER SUPERVISION PACK
# --------------------------------------------------

@router.get("/me/supervision-pack")
async def generate_my_supervision_pack_route(
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_staff_journal_table(conn)
        entries = list_staff_journals(conn, current_user["id"], limit=20)

        if not entries:
            raise HTTPException(
                status_code=404,
                detail="No journal entries found"
            )

        pack = await generate_supervision_pack(entries)

        return {
            "ok": True,
            "supervision_pack": pack,
            "user": current_user
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate supervision pack: {str(e)}"
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
# UPDATE JOURNAL
# --------------------------------------------------

@router.put("/{journal_id}")
async def update_staff_journal_route(
    journal_id: int,
    payload: StaffJournalUpdate,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_staff_journal_table(conn)

        existing = get_staff_journal(conn, journal_id)

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Journal not found"
            )

        if int(existing["staff_id"]) != int(current_user["id"]):
            raise HTTPException(
                status_code=403,
                detail="You can only edit your own journal entries"
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


# --------------------------------------------------
# DELETE JOURNAL
# --------------------------------------------------

@router.delete("/{journal_id}")
async def delete_staff_journal_route(
    journal_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_staff_journal_table(conn)

        existing = get_staff_journal(conn, journal_id)
        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Journal not found"
            )

        if int(existing["staff_id"]) != int(current_user["id"]):
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own journal entries"
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


# --------------------------------------------------
# SUBMIT TO MANAGER DASHBOARD
# --------------------------------------------------

@router.post("/{journal_id}/submit-to-manager")
async def submit_to_manager_dashboard_route(
    journal_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
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

        if int(journal["staff_id"]) != int(current_user["id"]):
            raise HTTPException(
                status_code=403,
                detail="You can only submit your own journal entries"
            )

        entries = list_staff_journals(conn, current_user["id"], limit=20)

        journal_summary = build_journal_summary(journal)
        development_plan = await generate_staff_pdp(entries)
        supervision_pack = await generate_supervision_pack(entries)

        submission = create_supervision_submission(
            conn=conn,
            staff_id=current_user["id"],
            journal_id=journal_id,
            journal_summary=journal_summary,
            development_plan=development_plan,
            supervision_pack=supervision_pack
        )

        return {
            "ok": True,
            "message": "Submitted to manager dashboard",
            "submission": submission,
            "user": current_user
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not submit to manager dashboard: {str(e)}"
        )


# --------------------------------------------------
# OPTIONAL EXISTING STAFF-ID ROUTES
# keep these only if managers/admins need them
# --------------------------------------------------

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
