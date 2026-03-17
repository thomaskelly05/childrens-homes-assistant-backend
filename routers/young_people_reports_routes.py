from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(tags=["Young People Reports"])


@router.get("/young-people/{young_person_id}/reports")
def list_young_person_reports(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        query = """
            SELECT
                r.id,
                r.young_person_id,
                r.report_type,
                r.title,
                r.review_month,
                r.report_text,
                r.status,
                r.generated_by,
                r.created_at,
                r.updated_at
            FROM ai_generated_reports r
            WHERE r.young_person_id = %s
            ORDER BY r.created_at DESC
        """

        with conn.cursor() as cur:
            cur.execute(query, (young_person_id,))
            rows = cur.fetchall()

        return rows

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load reports: {str(e)}")


@router.get("/reports/{report_id}/links")
def get_report_links(
    report_id: int,
    conn=Depends(get_db),
):
    try:
        query = """
            SELECT
                l.id,
                l.report_id,
                l.source_table,
                l.source_id,
                l.link_reason,
                l.created_at
            FROM ai_report_links l
            WHERE l.report_id = %s
            ORDER BY l.created_at ASC, l.id ASC
        """

        with conn.cursor() as cur:
            cur.execute(query, (report_id,))
            rows = cur.fetchall()

        return rows

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load report links: {str(e)}")
