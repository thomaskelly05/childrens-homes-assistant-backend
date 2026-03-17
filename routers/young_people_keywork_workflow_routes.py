from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people/keywork", tags=["Young People Key Work Workflow"])


@router.put("/{keywork_id}/submit")
def submit_keywork(keywork_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET workflow_status = 'submitted',
                    submitted_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (keywork_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Key work not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit key work: {str(e)}")


@router.put("/{keywork_id}/approve")
def approve_keywork(keywork_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET workflow_status = 'approved',
                    reviewed_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (keywork_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Key work not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve key work: {str(e)}")


@router.put("/{keywork_id}/return")
def return_keywork(keywork_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET workflow_status = 'returned',
                    returned_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (keywork_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Key work not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return key work: {str(e)}")


@router.put("/{keywork_id}/archive")
def archive_keywork(keywork_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE keywork_sessions
                SET archived = TRUE,
                    workflow_status = 'archived',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (keywork_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Key work not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive key work: {str(e)}")
