import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import FileResponse

from auth.current_user import get_current_user
from db.connection import get_db
from services.audit_event_service import record_audit_event
from services.document_security_service import document_security_service, max_upload_bytes, scope_matches
from services.os_sync_hooks import sync_after_save
from services.workflow_response import gold_standard_response
from services.young_people_linking_service import YoungPeopleLinkingService

router = APIRouter(prefix="/young-people", tags=["Young People Statutory Documents"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "frontend", "assets", "uploads", "statutory_documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _safe_int(value):
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _current_user_id(current_user: dict) -> int | None:
    return _safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))


def _young_person_scope(conn, young_person_id: int) -> dict:
    with conn.cursor() as cur:
        cur.execute("SELECT id, home_id, provider_id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Young person not found")
    return dict(row)


def _assert_young_person_access(conn, young_person_id: int, current_user: dict) -> dict:
    row = _young_person_scope(conn, young_person_id)
    if not scope_matches(current_user, row):
        record_audit_event(
            event_type="document.access_denied",
            action="statutory_document_young_person_scope_denied",
            outcome="denied",
            actor=current_user,
            resource_type="young_person",
            resource_id=str(young_person_id),
        )
        raise HTTPException(status_code=403, detail="You do not have access to this young person's documents")
    return row


def _shape_document(row: dict[str, Any] | None) -> dict[str, Any]:
    item = dict(row or {})
    item.setdefault("record_type", "statutory_document")
    item.setdefault("workflow_status", item.get("status") or "current")
    item.setdefault("recorded_at", item.get("created_at") or item.get("issue_date"))
    item.setdefault("summary", item.get("description") or item.get("title") or "Statutory document")
    return item


def _load_document(conn, document_id: int) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM statutory_documents
            WHERE id = %s
            LIMIT 1
            """,
            (document_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Statutory document not found")
    return _shape_document(dict(row))


def _assert_document_access(conn, document_id: int, current_user: dict) -> dict:
    row = _load_document(conn, document_id)
    if not scope_matches(current_user, row):
        record_audit_event(
            event_type="document.access_denied",
            action="statutory_document_scope_denied",
            outcome="denied",
            actor=current_user,
            resource_type="statutory_document",
            resource_id=str(document_id),
        )
        raise HTTPException(status_code=403, detail="You do not have access to this document")
    return row


def _sync_statutory_document(item: dict[str, Any]) -> dict[str, Any]:
    try:
        ok = sync_after_save("statutory_documents", item)
        return {"attempted": True, "ok": bool(ok), "source_table": "statutory_documents"}
    except Exception as error:
        return {"attempted": True, "ok": False, "source_table": "statutory_documents", "error": str(error)}


def _link_statutory_document_event(conn, *, item: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    status = str(item.get("status") or "current").lower()
    workflow = YoungPeopleLinkingService.process_record_event(
        conn=conn,
        young_person_id=int(item["young_person_id"]),
        source_table="statutory_documents",
        source_id=int(item["id"]),
        event_type=event_type,
        title=f"Statutory document {event_type}: {item.get('title') or item.get('document_type') or 'Document'}",
        summary=item.get("description") or item.get("title") or f"Statutory document {event_type}",
        narrative=item.get("description") or item.get("title") or f"Statutory document {event_type}",
        category="document",
        subcategory=item.get("document_type") or "statutory_document",
        significance="high" if status in {"expired", "amendment_requested", "archived"} else "medium",
        review_date=item.get("review_date") or item.get("expiry_date"),
        due_date=item.get("review_date") or item.get("expiry_date"),
        owner_id=item.get("uploaded_by"),
        created_by=_current_user_id(current_user),
        workflow={
            "link_chronology": True,
            "create_task": bool(item.get("review_date") or item.get("expiry_date")),
            "manager_review": status in {"submitted", "under_review", "amendment_requested", "approved"},
            "safeguarding": False,
            "link_support_plans": True,
            "link_monthly_reviews": True,
            "link_quality_standards": True,
        },
        metadata={
            "document_type": item.get("document_type"),
            "document_status": status,
            "compliance_category": item.get("compliance_category"),
            "linked_standard_code": item.get("linked_standard_code"),
            "quality_standards": [item.get("linked_standard_code") or "leadership_and_management"],
            "standards_rationale": "Linked from statutory document workflow",
            "evidence_strength": "strong",
        },
    )
    conn.commit()
    return workflow


def _document_response(*, item: dict[str, Any], workflow: dict[str, Any] | None = None, sync: dict[str, Any] | None = None, message: str | None = None) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow=workflow or {},
        sync=sync or {},
        statutory_document=item,
        document=item,
    )


def _update_document_status(conn, document_id: int, status: str) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE statutory_documents
            SET status = %s,
                archived = CASE WHEN %s = 'archived' THEN TRUE ELSE COALESCE(archived, FALSE) END,
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
            """,
            (status, status, document_id),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Statutory document not found")
    conn.commit()
    return _shape_document(dict(row))


@router.get("/{young_person_id}/statutory-documents")
def list_statutory_documents(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        _assert_young_person_access(conn, young_person_id, current_user)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM statutory_documents
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY review_date ASC NULLS LAST, expiry_date ASC NULLS LAST, created_at DESC
                """,
                (young_person_id,),
            )
            rows = [_shape_document(dict(row)) for row in (cur.fetchall() or [])]
            return {"ok": True, "items": rows, "statutory_documents": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load statutory documents: {str(e)}")


@router.get("/{young_person_id}/statutory-documents/archive")
def list_statutory_documents_archive(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        _assert_young_person_access(conn, young_person_id, current_user)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM statutory_documents
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = TRUE
                ORDER BY created_at DESC
                """,
                (young_person_id,),
            )
            rows = [_shape_document(dict(row)) for row in (cur.fetchall() or [])]
            return {"ok": True, "items": rows, "statutory_documents": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load archived statutory documents: {str(e)}")


@router.get("/statutory-documents/{document_id}")
def get_statutory_document(document_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        item = _assert_document_access(conn, document_id, current_user)
        return _document_response(item=item, message="Statutory document loaded")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load statutory document: {str(e)}")


@router.post("/{young_person_id}/statutory-documents")
def create_statutory_document(young_person_id: int, payload: dict = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        scope = _assert_young_person_access(conn, young_person_id, current_user)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO statutory_documents (
                    young_person_id,
                    home_id,
                    document_type,
                    title,
                    description,
                    issue_date,
                    review_date,
                    expiry_date,
                    status,
                    compliance_category,
                    linked_standard_code,
                    uploaded_by,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    %(young_person_id)s,
                    %(home_id)s,
                    %(document_type)s,
                    %(title)s,
                    %(description)s,
                    %(issue_date)s,
                    %(review_date)s,
                    %(expiry_date)s,
                    COALESCE(%(status)s, 'current'),
                    %(compliance_category)s,
                    %(linked_standard_code)s,
                    %(uploaded_by)s,
                    COALESCE(%(archived)s, FALSE),
                    NOW(),
                    NOW()
                )
                RETURNING *
                """,
                {
                    **payload,
                    "young_person_id": young_person_id,
                    "home_id": scope.get("home_id"),
                    "uploaded_by": _current_user_id(current_user),
                },
            )
            row = cur.fetchone()
        conn.commit()
        item = _shape_document(dict(row))
        workflow = _link_statutory_document_event(conn, item=item, event_type="created", current_user=current_user)
        sync = _sync_statutory_document(item)
        return _document_response(item=item, workflow=workflow, sync=sync, message="Statutory document created")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create statutory document: {str(e)}")


@router.patch("/statutory-documents/{document_id}")
@router.put("/statutory-documents/{document_id}")
def update_statutory_document(document_id: int, payload: dict = Body(...), current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        before = _assert_document_access(conn, document_id, current_user)
        merged = {**before, **payload, "id": document_id}
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE statutory_documents
                SET
                    document_type = %(document_type)s,
                    title = %(title)s,
                    description = %(description)s,
                    issue_date = %(issue_date)s,
                    review_date = %(review_date)s,
                    expiry_date = %(expiry_date)s,
                    status = %(status)s,
                    compliance_category = %(compliance_category)s,
                    linked_standard_code = %(linked_standard_code)s,
                    archived = COALESCE(%(archived)s, archived),
                    updated_at = NOW()
                WHERE id = %(id)s
                RETURNING *
                """,
                merged,
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Statutory document not found")
        conn.commit()
        item = _shape_document(dict(row))
        workflow = _link_statutory_document_event(conn, item=item, event_type="updated", current_user=current_user)
        sync = _sync_statutory_document(item)
        return _document_response(item=item, workflow=workflow, sync=sync, message="Statutory document updated")
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update statutory document: {str(e)}")


@router.post("/statutory-documents/{document_id}/submit")
@router.put("/statutory-documents/{document_id}/submit")
def submit_statutory_document(document_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_document_access(conn, document_id, current_user)
    item = _update_document_status(conn, document_id, "submitted")
    workflow = _link_statutory_document_event(conn, item=item, event_type="submitted", current_user=current_user)
    sync = _sync_statutory_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Statutory document submitted")


@router.post("/statutory-documents/{document_id}/approve")
@router.put("/statutory-documents/{document_id}/approve")
def approve_statutory_document(document_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_document_access(conn, document_id, current_user)
    item = _update_document_status(conn, document_id, "approved")
    workflow = _link_statutory_document_event(conn, item=item, event_type="approved", current_user=current_user)
    sync = _sync_statutory_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Statutory document approved")


@router.post("/statutory-documents/{document_id}/return")
@router.put("/statutory-documents/{document_id}/return")
def return_statutory_document(document_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_document_access(conn, document_id, current_user)
    item = _update_document_status(conn, document_id, "amendment_requested")
    workflow = _link_statutory_document_event(conn, item=item, event_type="returned", current_user=current_user)
    sync = _sync_statutory_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Statutory document returned")


@router.post("/statutory-documents/{document_id}/archive")
@router.put("/statutory-documents/{document_id}/archive")
def archive_statutory_document(document_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    _assert_document_access(conn, document_id, current_user)
    item = _update_document_status(conn, document_id, "archived")
    workflow = _link_statutory_document_event(conn, item=item, event_type="archived", current_user=current_user)
    sync = _sync_statutory_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Statutory document archived")


@router.post("/{young_person_id}/statutory-documents/upload")
def upload_statutory_document(
    young_person_id: int,
    document_type: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    issue_date: str = Form(None),
    review_date: str = Form(None),
    expiry_date: str = Form(None),
    status: str = Form("current"),
    compliance_category: str = Form(None),
    linked_standard_code: str = Form(None),
    uploaded_by: int = Form(None),
    home_id: int = Form(None),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        scope = _assert_young_person_access(conn, young_person_id, current_user)
        security = document_security_service.validate_upload(file, document_type=document_type, current_user=current_user)
        filename = security.safe_filename or Path(file.filename or "document").name
        file_path = os.path.join(UPLOAD_DIR, filename)

        size = 0
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > max_upload_bytes():
                    buffer.close()
                    os.unlink(file_path)
                    raise HTTPException(status_code=413, detail="Uploaded document is too large")
                buffer.write(chunk)

        public_url = f"/assets/uploads/statutory_documents/{filename}"

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO statutory_documents (
                    young_person_id,
                    home_id,
                    document_type,
                    title,
                    description,
                    file_url,
                    file_name,
                    file_type,
                    issue_date,
                    review_date,
                    expiry_date,
                    status,
                    compliance_category,
                    linked_standard_code,
                    uploaded_by,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    FALSE,
                    NOW(),
                    NOW()
                )
                RETURNING *
                """,
                (
                    young_person_id,
                    scope.get("home_id") or home_id,
                    document_type,
                    title,
                    description,
                    public_url,
                    file.filename,
                    file.content_type,
                    issue_date,
                    review_date,
                    expiry_date,
                    status,
                    compliance_category,
                    linked_standard_code,
                    _current_user_id(current_user),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        item = _shape_document(dict(row))
        workflow = _link_statutory_document_event(conn, item=item, event_type="uploaded", current_user=current_user)
        sync = _sync_statutory_document(item)
        return _document_response(item=item, workflow=workflow, sync=sync, message="Statutory document uploaded")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload statutory document: {str(e)}")


@router.get("/statutory-documents/{document_id}/download")
def download_statutory_document(document_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    try:
        row = _assert_document_access(conn, document_id, current_user)

        if not row.get("file_url"):
            raise HTTPException(status_code=404, detail="No file uploaded for this document")

        rel_path = row["file_url"].lstrip("/")
        root = Path(BASE_DIR, "frontend").resolve()
        file_path = document_security_service.validate_path_under_root(root, root / rel_path)

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Stored file not found")

        record_audit_event(
            event_type="document.download",
            action="download_statutory_document",
            outcome="success",
            actor=current_user,
            resource_type="statutory_document",
            resource_id=str(document_id),
            metadata={"home_id": row.get("home_id"), "young_person_id": row.get("young_person_id")},
        )
        return FileResponse(file_path, filename=row.get("file_name") or os.path.basename(file_path))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download statutory document: {str(e)}")
