from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter(tags=["young-people-shell-item-compat"])


CANONICAL_ITEM_ROUTES = {
    "daily-notes": "/young-people/daily-notes/{record_id}",
    "incidents": "/young-people/incidents/{record_id}",
    "plans": "/young-people/plans/{record_id}",
    "risk": "/young-people/risk/{record_id}",
    "appointments": "/young-people/appointments/{record_id}",
    "health": "/young-people/health-records/{record_id}",
    "health-records": "/young-people/health-records/{record_id}",
    "medication-records": "/young-people/medication-records/{record_id}",
    "education": "/young-people/education-records/{record_id}",
    "education-records": "/young-people/education-records/{record_id}",
    "family": "/young-people/family/records/{record_id}",
    "family-records": "/young-people/family/records/{record_id}",
    "keywork": "/young-people/keywork/{record_id}",
    "safeguarding": "/young-people/safeguarding/{record_id}",
    "missing-episodes": "/young-people/missing-episodes/{record_id}",
    "handover": "/young-people/handover/{record_id}",
    "documents": "/young-people/documents/{record_id}",
    "statutory-documents": "/young-people/statutory-documents/{record_id}",
}


CANONICAL_ACTION_ROUTES = {
    "daily-notes": "/young-people/daily-notes/{record_id}/{action}",
    "incidents": "/young-people/incidents/{record_id}/{action}",
    "plans": "/young-people/plans/{record_id}/{action}",
    "risk": "/young-people/risk/{record_id}/{action}",
    "appointments": "/young-people/appointments/{record_id}/{action}",
    "health": "/young-people/health-records/{record_id}/{action}",
    "health-records": "/young-people/health-records/{record_id}/{action}",
    "medication-records": "/young-people/medication-records/{record_id}/{action}",
    "education": "/young-people/education-records/{record_id}/{action}",
    "education-records": "/young-people/education-records/{record_id}/{action}",
    "family": "/young-people/family/records/{record_id}/{action}",
    "family-records": "/young-people/family/records/{record_id}/{action}",
    "keywork": "/young-people/keywork/{record_id}/{action}",
    "safeguarding": "/young-people/safeguarding/{record_id}/{action}",
    "missing-episodes": "/young-people/missing-episodes/{record_id}/{action}",
    "handover": "/young-people/handover/{record_id}/{action}",
    "documents": "/young-people/documents/{record_id}/{action}",
    "statutory-documents": "/young-people/statutory-documents/{record_id}/{action}",
}


ALLOWED_ACTIONS = {"submit", "approve", "return", "archive"}


def _redirect(path_template: str, *, record_id: int, action: str | None = None) -> RedirectResponse:
    url = path_template.format(record_id=record_id, action=action or "")
    return RedirectResponse(url=url, status_code=307)


@router.get("/young-people-shell-item-compat/health")
def young_people_shell_item_compat_health():
    return {"ok": True, "router": "young_people_shell_item_compat_routes", "mode": "gold_standard_bridge"}


@router.get("/young-people/{young_person_id}/{section}/{record_id}")
def redirect_child_prefixed_item_route(young_person_id: int, section: str, record_id: int):
    template = CANONICAL_ITEM_ROUTES.get(section)
    if not template:
        raise HTTPException(status_code=404, detail="No compatible item route")
    return _redirect(template, record_id=record_id)


@router.post("/young-people/{young_person_id}/{section}/{record_id}/{action}")
@router.put("/young-people/{young_person_id}/{section}/{record_id}/{action}")
def redirect_child_prefixed_action_route(young_person_id: int, section: str, record_id: int, action: str):
    if action not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=404, detail="No compatible workflow action")
    template = CANONICAL_ACTION_ROUTES.get(section)
    if not template:
        raise HTTPException(status_code=404, detail="No compatible workflow route")
    return _redirect(template, record_id=record_id, action=action)
