"""Founder OS telemetry — anonymised platform event recording and founder analytics."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.permissions import require_authenticated_user, require_founder
from db.founder_persistence_db import sanitise_payload
from db.founder_telemetry_db import (
    append_telemetry_event,
    build_telemetry_summary,
    reject_identifiable_metadata,
)
from schemas.founder_telemetry import FounderTelemetryEventCreate

router = APIRouter(prefix="/founder-os/telemetry", tags=["Founder Telemetry"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": sanitise_payload(data)}


def _user_id(user: dict[str, Any]) -> int | None:
    raw = user.get("id")
    if raw is None:
        return None
    return int(raw)


def _user_role(user: dict[str, Any]) -> str | None:
    role = user.get("role")
    return str(role) if role else None


@router.post("/event")
def record_telemetry_event(
    body: FounderTelemetryEventCreate,
    user=Depends(require_authenticated_user),
):
    """Any authenticated user may submit redacted operational telemetry."""
    violations = reject_identifiable_metadata(body.metadata)
    if violations:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Telemetry metadata contains identifiable or unsafe fields.",
        )
    try:
        row = append_telemetry_event(
            user_id=_user_id(user),
            event_type=body.event_type,
            category=body.category,
            source=body.source,
            route=body.route,
            user_role=body.user_role or _user_role(user),
            session_id=body.session_id,
            metadata=body.metadata,
        )
    except ValueError as exc:
        detail = str(exc)
        if detail.startswith("identifiable_metadata:"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Telemetry metadata contains identifiable or unsafe fields.",
            ) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    return _success(row)


@router.get("/summary")
def telemetry_summary(
    days: int = Query(default=30, ge=1, le=90),
    user=Depends(require_founder),
):
    """Founder/admin analytics aggregate — not available to normal staff users."""
    summary = build_telemetry_summary(days=days)
    return _success(summary)
