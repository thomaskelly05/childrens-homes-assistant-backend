from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.permissions import require_read_access
from db.connection import get_db
from repositories.workspaces_repository import young_person_workspace

router = APIRouter(prefix="/child-workspace", tags=["Child Workspace Context"])

LEGACY_COMPATIBILITY_NOTE = (
    "Legacy compatibility route. Prefer GET /os/young-people/{young_person_id}/workspace."
)


def _legacy_context_from_workspace(
    *,
    young_person_id: int,
    workspace: dict[str, Any],
) -> dict[str, Any]:
    person = workspace.get("young_person") or {}
    chronology = workspace.get("chronology") or []
    actions = workspace.get("actions") or []
    evidence = workspace.get("evidence") or []
    display_name = (
        person.get("display_name")
        or " ".join(str(value) for value in [person.get("first_name"), person.get("last_name")] if value)
        or f"Young person {young_person_id}"
    )

    return {
        "ok": True,
        "legacy_compatibility_route": True,
        "compatibility_note": LEGACY_COMPATIBILITY_NOTE,
        "canonical_route": f"/os/young-people/{young_person_id}/workspace",
        "context_ready": True,
        "scope": {
            "type": "child",
            "young_person_id": young_person_id,
            "home_id": person.get("home_id"),
            "retrieval_scope": "selected_child_only",
            "allow_global_search": False,
        },
        "child": {
            "id": young_person_id,
            "display_name": display_name,
            "preferred_name": person.get("preferred_name") or person.get("first_name"),
            "status": person.get("placement_status") or person.get("status"),
            "risk_level": person.get("risk_level") or person.get("summary_risk_level"),
            "safeguarding_status": person.get("safeguarding_status"),
        },
        "summary": {
            "counts": {
                "chronology": len(chronology),
                "actions": len(actions),
                "evidence": len(evidence),
                "documents": len(workspace.get("documents") or []),
                "reports": len(workspace.get("reports") or []),
            },
            "recent_activity": chronology[:10],
            "alerts": [],
        },
        "workspace": workspace,
    }


@router.get("/context/{young_person_id}")
def get_child_workspace_context_legacy_compat(
    young_person_id: int,
    current_user=Depends(require_read_access),
    conn=Depends(get_db),
):
    """Legacy compatibility route — proxies to canonical young-person workspace."""
    workspace = young_person_workspace(
        conn,
        young_person_id=young_person_id,
        current_user=current_user,
    )
    return _legacy_context_from_workspace(
        young_person_id=young_person_id,
        workspace=workspace,
    )
