from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.current_user import get_current_user
from services.young_person_service import YoungPersonService
from services.workspace_records_service import WorkspaceRecordsService

router = APIRouter(prefix="/api", tags=["OS Shell API"])
records_service = WorkspaceRecordsService()


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


def _provider_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("provider_id") or current_user.get("providerId"))


def _name_from_person(row: dict[str, Any]) -> str:
    return (
        row.get("preferred_name")
        or " ".join([str(row.get("first_name") or "").strip(), str(row.get("last_name") or "").strip()]).strip()
        or row.get("name")
        or "Young person"
    )


def _normalise_child(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "young_person_id": row.get("id"),
        "name": _name_from_person(row),
        "first_name": row.get("first_name"),
        "last_name": row.get("last_name"),
        "preferred_name": row.get("preferred_name"),
        "date_of_birth": row.get("date_of_birth"),
        "age": row.get("age"),
        "home_id": row.get("home_id"),
        "provider_id": row.get("provider_id"),
        "placement_status": row.get("placement_status"),
        "status": row.get("placement_status") or "active",
        "risk": row.get("summary_risk_level") or row.get("risk_level"),
        "photo_url": row.get("photo_url"),
        "key_worker_id": row.get("primary_keyworker_id"),
        "admission_date": row.get("admission_date"),
    }


def _record_items(record_types: list[str], current_user: dict[str, Any], limit: int = 50) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for record_type in record_types:
        result = records_service.list_records(record_type=record_type, current_user=current_user, limit=limit)
        for record in result.get("records") or []:
            record["type"] = record.get("record_type") or record_type
            record["record_type"] = record.get("record_type") or record_type
            items.append(record)
    items.sort(key=lambda item: str(item.get("updated_at") or item.get("created_at") or ""), reverse=True)
    return items[:limit]


@router.get("/children")
def api_children(current_user: dict[str, Any] = Depends(get_current_user)):
    rows = YoungPersonService.list_young_people(
        home_id=_home_id(current_user),
        provider_id=_provider_id(current_user),
        include_archived=False,
        limit=250,
        offset=0,
    )
    items = [_normalise_child(dict(row)) for row in rows]
    return {"ok": True, "items": items, "children": items, "count": len(items)}


@router.get("/young-people")
def api_young_people(current_user: dict[str, Any] = Depends(get_current_user)):
    return api_children(current_user=current_user)


@router.get("/documents")
def api_documents(current_user: dict[str, Any] = Depends(get_current_user)):
    items = _record_items(["daily", "incident", "safeguarding", "missing"], current_user, limit=100)
    return {"ok": True, "items": items, "documents": items, "count": len(items)}


@router.get("/records")
def api_records(current_user: dict[str, Any] = Depends(get_current_user)):
    return api_documents(current_user=current_user)


@router.get("/chronology")
def api_chronology(current_user: dict[str, Any] = Depends(get_current_user)):
    children = api_children(current_user=current_user).get("items") or []
    entries: list[dict[str, Any]] = []
    for child in children[:50]:
        child_id = _safe_int(child.get("id"))
        if not child_id:
            continue
        for event in YoungPersonService.get_recent_activity(child_id, limit=20):
            event = dict(event)
            event["young_person_id"] = child_id
            event["child_name"] = child.get("name")
            entries.append(event)
    entries.sort(key=lambda item: str(item.get("occurred_at") or item.get("created_at") or ""), reverse=True)
    return {"ok": True, "items": entries, "chronology": entries, "count": len(entries)}


@router.get("/safeguarding")
def api_safeguarding(current_user: dict[str, Any] = Depends(get_current_user)):
    records = _record_items(["safeguarding", "incident", "missing"], current_user, limit=100)
    children = api_children(current_user=current_user).get("items") or []
    alerts: list[dict[str, Any]] = []
    for child in children[:50]:
        child_id = _safe_int(child.get("id"))
        if not child_id:
            continue
        for alert in YoungPersonService.get_active_alerts(child_id):
            alert = dict(alert)
            alert["young_person_id"] = child_id
            alert["child_name"] = child.get("name")
            alert["type"] = alert.get("alert_type") or "alert"
            alerts.append(alert)
    items = alerts + records
    return {"ok": True, "items": items, "safeguarding": items, "count": len(items)}


@router.get("/homes")
def api_homes(current_user: dict[str, Any] = Depends(get_current_user)):
    home_id = _home_id(current_user)
    item = {
        "id": home_id,
        "name": current_user.get("home_name") or current_user.get("selected_home_name") or "Current home",
        "provider_id": _provider_id(current_user),
        "status": "active",
    }
    return {"ok": True, "items": [item] if home_id else [], "homes": [item] if home_id else [], "count": 1 if home_id else 0}


@router.get("/workforce")
def api_workforce(current_user: dict[str, Any] = Depends(get_current_user)):
    item = {
        "id": current_user.get("id") or current_user.get("user_id"),
        "name": current_user.get("name") or current_user.get("email") or "Current user",
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "home_id": _home_id(current_user),
        "status": "active",
    }
    return {"ok": True, "items": [item], "workforce": [item], "count": 1}


@router.get("/os/context")
def api_os_context(current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "ok": True,
        "children": api_children(current_user=current_user).get("items") or [],
        "documents": api_documents(current_user=current_user).get("items") or [],
        "chronology": api_chronology(current_user=current_user).get("items") or [],
        "safeguarding": api_safeguarding(current_user=current_user).get("items") or [],
        "homes": api_homes(current_user=current_user).get("items") or [],
        "workforce": api_workforce(current_user=current_user).get("items") or [],
    }
