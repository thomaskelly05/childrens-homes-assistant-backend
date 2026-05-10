from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["young-people-shell-item-compat"])


@router.get("/young-people-shell-item-compat/health")
def young_people_shell_item_compat_health():
    return {"ok": True, "router": "young_people_shell_item_compat_routes"}
