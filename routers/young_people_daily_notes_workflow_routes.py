from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people/daily-notes", tags=["Young People Daily Notes Workflow"])


@router.put("/{note_id}/submit")
def submit_daily_note(note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET workflow_status = 'submitted',
                    submitted_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (note_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Daily note not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit daily note: {str(e)}")


@router.put("/{note_id}/approve")
def approve_daily_note(note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET workflow_status = 'approved',
                    approved_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (note_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Daily note not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve daily note: {str(e)}")


@router.put("/{note_id}/return")
def return_daily_note(note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET workflow_status = 'returned',
                    returned_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (note_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Daily note not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return daily note: {str(e)}")


@router.put("/{note_id}/archive")
def archive_daily_note(note_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE daily_notes
                SET workflow_status = 'archived',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (note_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Daily note not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive daily note: {str(e)}")
