"""Staff Profile OS routes — metadata-only adult working-life dashboard."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.staff_profile_os import StaffProfileOsFilters
from services.staff_profile_os_service import staff_profile_os_service

router = APIRouter(prefix="/staff-profile-os", tags=["Staff Profile OS"])
compat_router = APIRouter(prefix="/api/staff-profile-os", tags=["Staff Profile OS API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


@router.get("/health")
async def staff_profile_os_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(staff_profile_os_service.get_health(conn=conn).model_dump())


@router.get("/{staff_id}")
async def staff_profile_os_dashboard(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    dashboard = staff_profile_os_service.build_dashboard(staff_id, current_user, conn=conn)
    return _success(dashboard.model_dump())


@router.get("/{staff_id}/overview")
async def staff_profile_os_overview(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    staff_profile_os_service.enforce_access(staff_id, current_user)
    overview = staff_profile_os_service.build_overview(staff_id, current_user, conn=conn)
    return _success(overview.model_dump())


@router.get("/{staff_id}/actions")
async def staff_profile_os_actions(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    staff_profile_os_service.enforce_access(staff_id, current_user)
    section = staff_profile_os_service.build_actions_section(staff_id, current_user, conn=conn)
    return _success(section.model_dump())


@router.get("/{staff_id}/training")
async def staff_profile_os_training(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    staff_profile_os_service.enforce_access(staff_id, current_user)
    section = staff_profile_os_service.build_training_section(staff_id, current_user, conn=conn)
    return _success(section.model_dump())


@router.get("/{staff_id}/supervision")
async def staff_profile_os_supervision(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    staff_profile_os_service.enforce_access(staff_id, current_user)
    section = staff_profile_os_service.build_supervision_section(staff_id, current_user, conn=conn)
    return _success(section.model_dump())


@router.get("/{staff_id}/wellbeing")
async def staff_profile_os_wellbeing(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    staff_profile_os_service.enforce_access(staff_id, current_user)
    section = staff_profile_os_service.build_wellbeing_section(staff_id, current_user, conn=conn)
    return _success(section.model_dump())


@compat_router.get("/health")
async def api_staff_profile_os_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await staff_profile_os_health(current_user=current_user, conn=conn)


@compat_router.get("/{staff_id}")
async def api_staff_profile_os_dashboard(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await staff_profile_os_dashboard(staff_id=staff_id, current_user=current_user, conn=conn)


@compat_router.get("/{staff_id}/overview")
async def api_staff_profile_os_overview(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await staff_profile_os_overview(staff_id=staff_id, current_user=current_user, conn=conn)


@compat_router.get("/{staff_id}/actions")
async def api_staff_profile_os_actions(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await staff_profile_os_actions(staff_id=staff_id, current_user=current_user, conn=conn)


@compat_router.get("/{staff_id}/training")
async def api_staff_profile_os_training(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await staff_profile_os_training(staff_id=staff_id, current_user=current_user, conn=conn)


@compat_router.get("/{staff_id}/supervision")
async def api_staff_profile_os_supervision(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await staff_profile_os_supervision(staff_id=staff_id, current_user=current_user, conn=conn)


@compat_router.get("/{staff_id}/wellbeing")
async def api_staff_profile_os_wellbeing(
    staff_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await staff_profile_os_wellbeing(staff_id=staff_id, current_user=current_user, conn=conn)
