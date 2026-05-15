from __future__ import annotations

from fastapi import APIRouter, Depends

from auth.permissions import require_read_access
from services.child_workspace_context_service import child_workspace_context_service

router = APIRouter(prefix="/child-workspace", tags=["Child Workspace Context"])


@router.get("/context/{young_person_id}")
def get_child_workspace_context(
    young_person_id: int,
    current_user=Depends(require_read_access),
):
    return child_workspace_context_service.resolve_context(
        young_person_id=young_person_id,
        current_user=current_user,
    )
