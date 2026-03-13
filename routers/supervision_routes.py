from fastapi import APIRouter, HTTPException, Depends, Query

from db.connection import get_db
from db.supervision_db import (
    ensure_supervision_table,
    list_supervision_submissions,
    get_supervision_submission,
    mark_supervision_submission_reviewed,
)

router = APIRouter(
    prefix="/supervision",
    tags=["Supervision"]
)


@router.get("/submissions")
async def list_supervision_submissions_route(
    limit: int = Query(50, ge=1, le=100),
    conn=Depends(get_db)
):
    try:
        ensure_supervision_table(conn)
        submissions = list_supervision_submissions(conn, limit=limit)

        return {
            "ok": True,
            "submissions": submissions
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load supervision submissions: {str(e)}"
        )


@router.get("/submissions/{submission_id}")
async def get_supervision_submission_route(
    submission_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_supervision_table(conn)
        submission = get_supervision_submission(conn, submission_id)

        if not submission:
            raise HTTPException(
                status_code=404,
                detail="Supervision submission not found"
            )

        return {
            "ok": True,
            "submission": submission
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load supervision submission: {str(e)}"
        )


@router.post("/submissions/{submission_id}/review")
async def mark_submission_reviewed_route(
    submission_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_supervision_table(conn)
        submission = mark_supervision_submission_reviewed(conn, submission_id)

        if not submission:
            raise HTTPException(
                status_code=404,
                detail="Supervision submission not found"
            )

        return {
            "ok": True,
            "submission": submission
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not mark submission as reviewed: {str(e)}"
        )
