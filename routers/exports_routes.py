import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse

from auth.current_user import get_current_user
from db.connection import get_db
from services.audit_event_service import record_audit_event
from services.document_security_service import scope_matches
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


def _enforce_export_access(row: dict, *, record_type: str, record_id: int, current_user: dict) -> None:
    role = str(current_user.get("role") or "").strip().lower()
    privileged = role in {"admin", "super_admin", "superadmin", "founder", "owner"}
    if not row.get("home_id") and not row.get("provider_id") and not privileged:
        record_audit_event(
            event_type="export.denied",
            action="export_scope_missing",
            outcome="denied",
            actor=current_user,
            resource_type=record_type,
            resource_id=str(record_id),
        )
        raise HTTPException(status_code=403, detail="Export access cannot be verified")
    if not scope_matches(current_user, row):
        record_audit_event(
            event_type="export.denied",
            action="export_scope_denied",
            outcome="denied",
            actor=current_user,
            resource_type=record_type,
            resource_id=str(record_id),
        )
        raise HTTPException(status_code=403, detail="You do not have access to export this record")


def _load_authorised_record(conn, record_type: str, record_id: int, current_user: dict):
    row = _load_record(conn, record_type, record_id)
    _enforce_export_access(row, record_type=record_type, record_id=record_id, current_user=current_user)
    record_audit_event(
        event_type="export.access",
        action="export_record",
        outcome="success",
        actor=current_user,
        resource_type=record_type,
        resource_id=str(record_id),
        metadata={"home_id": row.get("home_id"), "provider_id": row.get("provider_id")},
    )
    return row


@router.get("/{record_type}/{record_id}/print", response_class=HTMLResponse)
def export_print(record_type: str, record_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        row = _load_authorised_record(conn, record_type, record_id, current_user)
        return HTMLResponse(content=render_html_document(record_type, row))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate print view: {str(e)}")


@router.get("/{record_type}/{record_id}/docx")
def export_docx(record_type: str, record_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        row = _load_authorised_record(conn, record_type, record_id, current_user)
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
def export_pdf(record_type: str, record_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        row = _load_authorised_record(conn, record_type, record_id, current_user)
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
