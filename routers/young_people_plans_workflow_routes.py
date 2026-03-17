from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people/plans", tags=["Young People Plans Workflow"])


@router.put("/{plan_id}/submit")
def submit_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_person_plans
                SET
                    workflow_status = 'submitted',
                    submitted_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (plan_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")

        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit plan: {str(e)}")


@router.put("/{plan_id}/approve")
def approve_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_person_plans
                SET
                    workflow_status = 'approved',
                    reviewed_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (plan_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")

        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve plan: {str(e)}")


@router.put("/{plan_id}/return")
def return_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_person_plans
                SET
                    workflow_status = 'returned',
                    returned_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (plan_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")

        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to return plan: {str(e)}")


@router.put("/{plan_id}/archive")
def archive_plan(plan_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE young_person_plans
                SET
                    archived = TRUE,
                    workflow_status = 'archived',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (plan_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")

        conn.commit()
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive plan: {str(e)}")
