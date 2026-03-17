from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people/incidents", tags=["Young People Incidents Workflow"])


@router.put("/{incident_id}/submit")
def submit_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE incidents
                SET workflow_status = 'submitted',
                    submitted_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (incident_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit incident: {str(e)}")


@router.put("/{incident_id}/approve")
def approve_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE incidents
                SET workflow_status = 'approved',
                    reviewed_at = NOW(),
                    manager_review_status = 'reviewed',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (incident_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve incident: {str(e)}")


@router.put("/{incident_id}/return")
def return_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE incidents
                SET workflow_status = 'returned',
                    returned_at = NOW(),
                    manager_review_status = 'returned',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (incident_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return incident: {str(e)}")


@router.put("/{incident_id}/archive")
def archive_incident(incident_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE incidents
                SET archived = TRUE,
                    workflow_status = 'archived',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (incident_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")
        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive incident: {str(e)}")
