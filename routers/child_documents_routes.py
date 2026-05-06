from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.child_documents_service import ChildDocumentsService

router = APIRouter(prefix="/child-documents", tags=["child-documents"])
service = ChildDocumentsService()


@router.get("")
def list_documents(
    young_person_id: Optional[int] = None,
    group: Optional[str] = None,
    status: Optional[str] = None,
    query: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_archived: bool = False,
    limit: int = 100,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.list_documents(
        current_user=current_user,
        young_person_id=young_person_id,
        group=group,
        status=status,
        query=query,
        date_from=date_from,
        date_to=date_to,
        include_archived=include_archived,
        limit=limit,
    )


@router.get("/calendar")
def calendar(
    young_person_id: Optional[int] = None,
    month: Optional[str] = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.calendar(current_user=current_user, young_person_id=young_person_id, month=month)


@router.post("")
def create_document(
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.create_document(payload=payload, current_user=current_user)


@router.get("/{document_id}")
def get_document(
    document_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.get_document(document_id=document_id, current_user=current_user)


@router.patch("/{document_id}")
def update_document(
    document_id: int,
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.update_document(document_id=document_id, payload=payload, current_user=current_user)


@router.post("/{document_id}/submit")
def submit_document(
    document_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    data = payload or {}
    data["status"] = "submitted_for_review"
    data.setdefault("version_reason", "submitted_for_review")
    return service.update_document(document_id=document_id, payload=data, current_user=current_user)


@router.post("/{document_id}/review")
def review_document(
    document_id: int,
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    action = payload.get("action") or payload.get("status") or "approved"
    status = {"approve": "approved", "request_changes": "changes_requested", "archive": "archived"}.get(action, action)
    payload["status"] = status
    payload.setdefault("version_reason", status)
    result = service.update_document(document_id=document_id, payload=payload, current_user=current_user)
    comment = payload.get("comment") or payload.get("manager_comment")
    if comment:
        service.add_comment(document_id=document_id, comment=comment, comment_type="review", current_user=current_user)
    return result


@router.post("/{document_id}/archive")
def archive_document(
    document_id: int,
    payload: dict[str, Any] | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    data = payload or {}
    data["status"] = "archived"
    data.setdefault("version_reason", "archived")
    return service.update_document(document_id=document_id, payload=data, current_user=current_user)


@router.get("/{document_id}/versions")
def document_versions(
    document_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.versions(document_id=document_id, current_user=current_user)


@router.get("/{document_id}/comments")
def document_comments(
    document_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.comments(document_id=document_id, current_user=current_user)


@router.post("/{document_id}/comments")
def add_comment(
    document_id: int,
    payload: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.add_comment(
        document_id=document_id,
        comment=payload.get("comment") or payload.get("text") or "",
        comment_type=payload.get("comment_type") or "review",
        current_user=current_user,
    )
