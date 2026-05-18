from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Body

from auth.dependencies import get_current_user
from services.child_documents_service import ChildDocumentsService
from services.os_sync_hooks import sync_after_save
from services.workflow_response import gold_standard_response
from services.young_people_linking_service import YoungPeopleLinkingService

router = APIRouter(prefix="/young-people", tags=["Young People Documents Compat"])
service = ChildDocumentsService()


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _document_from_result(result: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {}
    document = result.get("document") or result.get("item") or result.get("data") or {}
    return _shape_document(document if isinstance(document, dict) else {})


def _shape_document(item: dict[str, Any]) -> dict[str, Any]:
    row = dict(item or {})
    row.setdefault("record_type", "document")
    row.setdefault("workflow_status", row.get("status") or "draft")
    row.setdefault("recorded_at", row.get("document_date") or row.get("created_at"))
    row.setdefault("summary", row.get("title") or row.get("editable_title") or row.get("document_type") or "Child document")
    return row


def _sync_document(item: dict[str, Any]) -> dict[str, Any]:
    try:
        ok = sync_after_save("documents", item)
        return {"attempted": True, "ok": bool(ok), "source_table": "documents"}
    except Exception as error:
        return {"attempted": True, "ok": False, "source_table": "documents", "error": str(error)}


def _link_document_event(*, item: dict[str, Any], event_type: str, current_user: dict[str, Any]) -> dict[str, Any]:
    # The existing child document service owns its own connection lifecycle.
    # Keep linking best-effort here so document saves remain non-blocking.
    try:
        from db.connection import get_db_connection, release_db_connection

        conn = None
        try:
            conn = get_db_connection()
            workflow = YoungPeopleLinkingService.process_record_event(
                conn=conn,
                young_person_id=int(item["young_person_id"]),
                source_table="documents",
                source_id=int(item["id"]),
                event_type=event_type,
                title=f"Document {event_type}: {item.get('title') or item.get('document_type') or 'Child document'}",
                summary=item.get("summary") or item.get("title") or f"Document {event_type}",
                narrative=item.get("summary") or item.get("title") or f"Document {event_type}",
                category="document",
                subcategory=item.get("document_type") or item.get("document_group") or "child_document",
                significance="medium",
                review_date=item.get("document_date"),
                due_date=item.get("document_date"),
                owner_id=item.get("created_by"),
                created_by=_safe_int(current_user.get("id") or current_user.get("user_id") or current_user.get("sub")),
                workflow={
                    "link_chronology": True,
                    "create_task": str(item.get("status") or "").lower() in {"submitted", "under_review", "amendment_requested"},
                    "manager_review": str(item.get("status") or "").lower() in {"submitted", "under_review", "amendment_requested", "approved"},
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "document_type": item.get("document_type"),
                    "document_group": item.get("document_group"),
                    "document_status": item.get("status"),
                    "quality_standards": ["leadership_and_management"],
                    "standards_rationale": "Linked from child document workflow",
                    "evidence_strength": "medium",
                },
            )
            conn.commit()
            return workflow
        finally:
            if conn is not None:
                release_db_connection(conn)
    except Exception as error:
        return {"ok": False, "error": str(error), "best_effort": True}


def _document_response(*, item: dict[str, Any], workflow: dict[str, Any] | None = None, sync: dict[str, Any] | None = None, message: str | None = None, legacy: dict[str, Any] | None = None) -> dict[str, Any]:
    return gold_standard_response(
        id=item.get("id"),
        item=item,
        message=message,
        workflow=workflow or {},
        sync=sync or {},
        document=item,
        legacy=legacy,
    )


def _status_payload(status: str, payload: dict[str, Any] | None = None, reason: str | None = None) -> dict[str, Any]:
    data = dict(payload or {})
    data["status"] = status
    data.setdefault("version_reason", reason or status)
    return data


@router.get("/{young_person_id}/documents")
def list_young_person_documents(
    young_person_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.list_documents(
        current_user=current_user,
        young_person_id=young_person_id,
        include_archived=False,
        limit=100,
    )
    documents = [_shape_document(item) for item in result.get("documents", [])]
    return {"ok": bool(result.get("ok", True)), "items": documents, "documents": documents, "count": len(documents), "legacy": result}


@router.get("/{young_person_id}/documents/archive")
def list_archived_young_person_documents(
    young_person_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.list_documents(
        current_user=current_user,
        young_person_id=young_person_id,
        status="archived",
        include_archived=True,
        limit=100,
    )
    documents = [_shape_document(item) for item in result.get("documents", [])]
    return {"ok": bool(result.get("ok", True)), "items": documents, "documents": documents, "count": len(documents), "legacy": result}


@router.post("/{young_person_id}/documents")
def create_young_person_document(
    young_person_id: int,
    payload: dict[str, Any] = Body(...),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    data = {**payload, "young_person_id": young_person_id}
    result = service.create_document(payload=data, current_user=current_user)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error") or "Failed to create document")
    item = _document_from_result(result)
    workflow = _link_document_event(item=item, event_type="created", current_user=current_user)
    sync = _sync_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Document created", legacy=result)


@router.get("/documents/{document_id}")
def get_young_person_document(
    document_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.get_document(document_id=document_id, current_user=current_user)
    if not result.get("ok"):
        raise HTTPException(status_code=404, detail=result.get("error") or "Document not found")
    item = _document_from_result(result)
    return _document_response(item=item, message="Document loaded", legacy=result)


@router.patch("/documents/{document_id}")
@router.put("/documents/{document_id}")
def update_young_person_document(
    document_id: int,
    payload: dict[str, Any] = Body(...),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.update_document(document_id=document_id, payload=payload, current_user=current_user)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error") or "Failed to update document")
    item = _document_from_result(result)
    workflow = _link_document_event(item=item, event_type="updated", current_user=current_user)
    sync = _sync_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Document updated", legacy=result)


@router.post("/documents/{document_id}/submit")
@router.put("/documents/{document_id}/submit")
def submit_young_person_document(
    document_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.update_document(document_id=document_id, payload=_status_payload("submitted", payload, "submitted"), current_user=current_user)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error") or "Failed to submit document")
    item = _document_from_result(result)
    workflow = _link_document_event(item=item, event_type="submitted", current_user=current_user)
    sync = _sync_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Document submitted", legacy=result)


@router.post("/documents/{document_id}/approve")
@router.put("/documents/{document_id}/approve")
def approve_young_person_document(
    document_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.update_document(document_id=document_id, payload=_status_payload("approved", payload, "approved"), current_user=current_user)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error") or "Failed to approve document")
    item = _document_from_result(result)
    workflow = _link_document_event(item=item, event_type="approved", current_user=current_user)
    sync = _sync_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Document approved", legacy=result)


@router.post("/documents/{document_id}/return")
@router.put("/documents/{document_id}/return")
def return_young_person_document(
    document_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.update_document(document_id=document_id, payload=_status_payload("amendment_requested", payload, "returned"), current_user=current_user)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error") or "Failed to return document")
    item = _document_from_result(result)
    workflow = _link_document_event(item=item, event_type="returned", current_user=current_user)
    sync = _sync_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Document returned", legacy=result)


@router.post("/documents/{document_id}/archive")
@router.put("/documents/{document_id}/archive")
def archive_young_person_document(
    document_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = service.update_document(document_id=document_id, payload=_status_payload("archived", payload, "archived"), current_user=current_user)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error") or "Failed to archive document")
    item = _document_from_result(result)
    workflow = _link_document_event(item=item, event_type="archived", current_user=current_user)
    sync = _sync_document(item)
    return _document_response(item=item, workflow=workflow, sync=sync, message="Document archived", legacy=result)
