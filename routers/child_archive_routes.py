"""Child formal archive routes — authenticated, scope enforced."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.child_archive import ChildArchiveFilter
from services.child_archive_service import child_archive_service

router = APIRouter(prefix="/archive", tags=["Child Archive"])
compat_router = APIRouter(prefix="/api/archive", tags=["Child Archive API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
    }


def _user_dict(current_user: Any) -> dict[str, Any]:
    return current_user if isinstance(current_user, dict) else dict(current_user)


@router.get("/health")
async def archive_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(child_archive_service.get_health(conn=conn).model_dump())


@compat_router.get("/health")
async def api_archive_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await archive_health(current_user=current_user, conn=conn)


@router.get("/records")
async def list_archive_records(
    child_id: int | None = None,
    home_id: int | None = None,
    record_type: str | None = None,
    source_type: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    author_user_id: str | None = None,
    signed_off_by_user_id: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = ChildArchiveFilter(
        child_id=child_id,
        home_id=home_id,
        record_type=record_type,  # type: ignore[arg-type]
        source_type=source_type,
        date_from=date_from,
        date_to=date_to,
        author_user_id=author_user_id,
        signed_off_by_user_id=signed_off_by_user_id,
        search=search,
        page=page,
        page_size=page_size,
    )
    return _success(
        child_archive_service.list_archive(filters, _user_dict(current_user), conn=conn).model_dump()
    )


@compat_router.get("/records")
async def api_list_archive_records(**kwargs):
    return await list_archive_records(**kwargs)


@router.get("/records/{record_id}")
async def get_archive_record(
    record_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    record = child_archive_service.get_archive_record(record_id, _user_dict(current_user), conn=conn)
    if not record:
        raise HTTPException(status_code=404, detail="Archive record not found")
    return _success(record.model_dump())


@compat_router.get("/records/{record_id}")
async def api_get_archive_record(record_id: str, **kwargs):
    return await get_archive_record(record_id=record_id, **kwargs)


@router.post("/records/{record_id}/link-chronology")
async def link_archive_chronology(
    record_id: str,
    body: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    chronology_event_id = str(body.get("chronology_event_id") or "")
    if not chronology_event_id:
        raise HTTPException(status_code=400, detail="chronology_event_id required")
    record = child_archive_service.link_chronology(
        record_id, chronology_event_id, _user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Archive record not found")
    return _success(record.model_dump())


@compat_router.post("/records/{record_id}/link-chronology")
async def api_link_archive_chronology(record_id: str, body: dict[str, Any], **kwargs):
    return await link_archive_chronology(record_id=record_id, body=body, **kwargs)


@router.post("/records/{record_id}/link-lifeecho")
async def link_archive_lifeecho(
    record_id: str,
    body: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    memory_id = str(body.get("memory_id") or body.get("lifeecho_memory_id") or "")
    if not memory_id:
        raise HTTPException(status_code=400, detail="memory_id required")
    record = child_archive_service.link_lifeecho(
        record_id, memory_id, _user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Archive record not found")
    return _success(record.model_dump())


@compat_router.post("/records/{record_id}/link-lifeecho")
async def api_link_archive_lifeecho(record_id: str, body: dict[str, Any], **kwargs):
    return await link_archive_lifeecho(record_id=record_id, body=body, **kwargs)


@router.post("/records/{record_id}/link-plan-impacts")
async def link_archive_plan_impacts(
    record_id: str,
    body: dict[str, Any],
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    impact_ids = body.get("plan_impact_ids") or body.get("impact_ids") or []
    if not isinstance(impact_ids, list):
        raise HTTPException(status_code=400, detail="plan_impact_ids must be a list")
    record = child_archive_service.link_plan_impacts(
        record_id, [str(i) for i in impact_ids], _user_dict(current_user), conn=conn
    )
    if not record:
        raise HTTPException(status_code=404, detail="Archive record not found")
    return _success(record.model_dump())


@compat_router.post("/records/{record_id}/link-plan-impacts")
async def api_link_archive_plan_impacts(record_id: str, body: dict[str, Any], **kwargs):
    return await link_archive_plan_impacts(record_id=record_id, body=body, **kwargs)
