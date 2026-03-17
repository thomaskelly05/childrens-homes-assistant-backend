import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse

from db.connection import get_db
from services.export_service import (
    render_html_document,
    build_docx_bytes,
    build_pdf_bytes,
)

router = APIRouter(prefix="/exports", tags=["Exports"])


EXPORT_MAP = {
    "plan": {
        "query": "SELECT * FROM young_person_plans WHERE id = %s LIMIT 1",
        "filename": "plan",
    },
    "risk": {
        "query": "SELECT * FROM young_person_risk_assessments WHERE id = %s LIMIT 1",
        "filename": "risk_assessment",
    },
    "daily_note": {
        "query": "SELECT * FROM daily_notes WHERE id = %s LIMIT 1",
        "filename": "daily_note",
    },
    "incident": {
        "query": "SELECT * FROM incidents WHERE id = %s LIMIT 1",
        "filename": "incident",
    },
    "keywork": {
        "query": "SELECT * FROM keywork_sessions WHERE id = %s LIMIT 1",
        "filename": "keywork",
    },
    "handover": {
        "query": "SELECT * FROM handover_records WHERE id = %s LIMIT 1",
        "filename": "handover",
    },
    "report": {
        "query": "SELECT * FROM ai_generated_reports WHERE id = %s LIMIT 1",
        "filename": "ai_report",
    },
    "profile": {
        "query": "SELECT * FROM young_people WHERE id = %s LIMIT 1",
        "filename": "profile",
    },
    "statutory_document": {
        "query": "SELECT * FROM statutory_documents WHERE id = %s LIMIT 1",
        "filename": "statutory_document",
    },
}


def _load_record(conn, record_type: str, record_id: int):
    if record_type not in EXPORT_MAP:
        raise HTTPException(status_code=404, detail="Unsupported export type")

    with conn.cursor() as cur:
        cur.execute(EXPORT_MAP[record_type]["query"], (record_id,))
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Record not found")

    return row


@router.get("/{record_type}/{record_id}/print", response_class=HTMLResponse)
def export_print(record_type: str, record_id: int, conn=Depends(get_db)):
    try:
        row = _load_record(conn, record_type, record_id)
        return HTMLResponse(content=render_html_document(record_type, row))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate print view: {str(e)}")


@router.get("/{record_type}/{record_id}/docx")
def export_docx(record_type: str, record_id: int, conn=Depends(get_db)):
    try:
        row = _load_record(conn, record_type, record_id)
        buf = build_docx_bytes(record_type, row)
        filename = f"{EXPORT_MAP[record_type]['filename']}_{record_id}.docx"
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Word export: {str(e)}")


@router.get("/{record_type}/{record_id}/pdf")
def export_pdf(record_type: str, record_id: int, conn=Depends(get_db)):
    try:
        row = _load_record(conn, record_type, record_id)
        buf = build_pdf_bytes(record_type, row)
        filename = f"{EXPORT_MAP[record_type]['filename']}_{record_id}.pdf"
        return StreamingResponse(
            buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF export: {str(e)}")
