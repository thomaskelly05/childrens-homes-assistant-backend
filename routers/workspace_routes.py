from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import get_current_user
from db.connection import get_db_connection, release_db_connection
from services.workspace_orchestrator_service import WorkspaceOrchestratorService

router = APIRouter(prefix="/workspace", tags=["workspace"])


class DocumentActionRequest(BaseModel):
    document_id: int
    notes: str | None = None


class SubmitDocumentRequest(BaseModel):
    document_id: int


service = WorkspaceOrchestratorService()


@router.get("/child/{young_person_id}")
def get_child_workspace(
    young_person_id: int,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.child_workspace(young_person_id=young_person_id, current_user=current_user, days=days)


@router.get("/home/{home_id}")
def get_home_workspace(
    home_id: int,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.home_workspace(home_id=home_id, current_user=current_user, days=days)


@router.get("/manager")
def get_manager_workspace(
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.manager_workspace(current_user=current_user, days=days)


@router.get("/ofsted/{home_id}")
def get_ofsted_workspace(
    home_id: int,
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.ofsted_workspace(home_id=home_id, current_user=current_user, days=days)


# ----------------------
# Document workflow layer
# ----------------------


def _current_user_id(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
    try:
        return int(value) if value else None
    except Exception:
        return None


@router.post("/documents/submit")
def submit_document_for_approval(
    payload: SubmitDocumentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_required = TRUE,
                    approval_status = 'pending',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, young_person_id
                """,
                (payload.document_id,),
            )
            doc = cur.fetchone()
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")

            cur.execute(
                """
                INSERT INTO approvals (source_table, source_id, approval_type, requested_by, status)
                VALUES ('documents', %s, 'manager_approval', %s, 'pending')
                """,
                (payload.document_id, user_id),
            )

        conn.commit()
        return {"ok": True, "message": "Submitted for approval"}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/documents/approve")
def approve_document(
    payload: DocumentActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_status = 'approved', updated_at = NOW()
                WHERE id = %s
                """,
                (payload.document_id,),
            )

            cur.execute(
                """
                UPDATE approvals
                SET status = 'approved', approved_by = %s, approved_at = NOW(), notes = %s
                WHERE source_table = 'documents' AND source_id = %s AND status = 'pending'
                """,
                (user_id, payload.notes, payload.document_id),
            )

        conn.commit()
        return {"ok": True, "message": "Document approved"}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/documents/reject")
def reject_document(
    payload: DocumentActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_status = 'rejected', updated_at = NOW()
                WHERE id = %s
                """,
                (payload.document_id,),
            )

            cur.execute(
                """
                UPDATE approvals
                SET status = 'rejected', approved_by = %s, approved_at = NOW(), notes = %s
                WHERE source_table = 'documents' AND source_id = %s AND status = 'pending'
                """,
                (user_id, payload.notes, payload.document_id),
            )

        conn.commit()
        return {"ok": True, "message": "Document rejected"}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/documents/request-changes")
def request_document_changes(
    payload: DocumentActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_status = 'changes_requested', updated_at = NOW()
                WHERE id = %s
                """,
                (payload.document_id,),
            )

            cur.execute(
                """
                UPDATE approvals
                SET status = 'changes_requested', approved_by = %s, approved_at = NOW(), notes = %s
                WHERE source_table = 'documents' AND source_id = %s AND status = 'pending'
                """,
                (user_id, payload.notes, payload.document_id),
            )

        conn.commit()
        return {"ok": True, "message": "Changes requested"}
    finally:
        if conn is not None:
            release_db_connection(conn)
