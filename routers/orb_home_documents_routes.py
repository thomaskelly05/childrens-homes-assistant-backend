"""Canonical ORB Home Documents API at /orb/home-documents/*."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from schemas.orb_home_documents import OrbHomeDocumentListRequest, OrbHomeDocumentUpdate
from services.orb_home_documents_service import orb_home_documents_service

router = APIRouter(prefix="/orb/home-documents", tags=["ORB Home Documents"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _user_id(current_user: dict) -> int:
    uid = current_user.get("user_id") or current_user.get("id")
    if uid is None:
        raise HTTPException(status_code=401, detail="Sign in required")
    return int(uid)


@router.get("/health")
async def home_documents_health(current_user=Depends(require_standalone_orb_access)):
    _ = current_user
    return _success(orb_home_documents_service.health())


@router.get("/types")
async def list_document_types(current_user=Depends(require_standalone_orb_access)):
    _ = current_user
    return _success({"types": orb_home_documents_service.list_document_types()})


@router.get("/summary")
async def home_documents_summary(current_user=Depends(require_standalone_orb_access)):
    return _success(
        orb_home_documents_service.summary(_user_id(current_user), current_user)
    )


@router.get("")
async def list_home_documents(
    document_type: str | None = None,
    include_archived: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_standalone_orb_access),
):
    request = OrbHomeDocumentListRequest(
        document_type=document_type,  # type: ignore[arg-type]
        include_archived=include_archived,
        limit=limit,
        offset=offset,
    )
    items = orb_home_documents_service.list_documents(
        _user_id(current_user), current_user, request
    )
    return _success({"items": items, "total": len(items), "limit": limit, "offset": offset})


@router.post("/upload")
async def upload_home_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    document_type: str = Form(...),
    current_user=Depends(require_standalone_orb_access),
):
    try:
        record = await orb_home_documents_service.upload_document(
            _user_id(current_user),
            current_user,
            file,
            title=title,
            document_type=document_type,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _success(record)


@router.get("/{document_id}")
async def get_home_document(
    document_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    record = orb_home_documents_service.get_document(
        _user_id(current_user), current_user, document_id
    )
    if not record:
        raise HTTPException(status_code=404, detail="Home document not found")
    return _success(record)


@router.patch("/{document_id}")
async def update_home_document(
    document_id: str,
    body: OrbHomeDocumentUpdate,
    current_user=Depends(require_standalone_orb_access),
):
    record = orb_home_documents_service.update_document(
        _user_id(current_user), current_user, document_id, body
    )
    if not record:
        raise HTTPException(status_code=404, detail="Home document not found")
    return _success(record)


@router.post("/{document_id}/archive")
async def archive_home_document(
    document_id: str,
    current_user=Depends(require_standalone_orb_access),
):
    record = orb_home_documents_service.archive_document(
        _user_id(current_user), current_user, document_id
    )
    if not record:
        raise HTTPException(status_code=404, detail="Home document not found")
    return _success(record)


