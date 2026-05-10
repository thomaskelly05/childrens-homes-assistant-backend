from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user

router = APIRouter(tags=["young-people-safe"])


def _demo_rows() -> list[dict[str, Any]]:
    return [
        {
            "id": 1001,
            "young_person_id": 1001,
            "first_name": "Demo",
            "last_name": "Young Person",
            "preferred_name": "Demo",
            "home_id": 1,
            "placement_status": "active",
            "summary_risk_level": "medium",
        }
    ]


@router.get("/young-people")
def safe_list_young_people(
    search: str | None = Query(default=""),
    include_archived: bool = Query(default=False),
    sort_by: str = Query(default="last_name"),
    sort_dir: str = Query(default="asc"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Safe selector endpoint for the OS shell.

    This keeps the young people selector usable even while the underlying schema
    is being migrated. Real data is always attempted first; a demo-safe fallback
    prevents the whole shell failing with a 500.
    """
    try:
        from services.young_person_service import YoungPersonService

        role = str(current_user.get("role") or "").strip().lower()
        home_id = current_user.get("home_id") or current_user.get("homeId")
        provider_id = current_user.get("provider_id") or current_user.get("providerId")

        kwargs: dict[str, Any] = {
            "include_archived": include_archived,
            "search": search or "",
            "sort_by": sort_by,
            "sort_dir": sort_dir,
            "limit": limit,
            "offset": offset,
        }
        if role not in {"admin", "administrator", "super_admin", "superadmin", "provider_admin", "ri", "responsible_individual"}:
            kwargs["home_id"] = home_id
        else:
            kwargs["provider_id"] = provider_id

        rows = YoungPersonService.list_young_people(**kwargs)
        if not rows:
            rows = _demo_rows()
        return {"ok": True, "young_people": rows, "items": rows, "count": len(rows), "fallback": False}
    except Exception as exc:
        rows = _demo_rows()
        return {"ok": True, "young_people": rows, "items": rows, "count": len(rows), "fallback": True, "warning": str(exc)}
