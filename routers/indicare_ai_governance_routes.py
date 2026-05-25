"""IndiCare Intelligence AI governance dashboard routes (auth required, metadata only)."""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from db.connection import acquire_optional_dashboard_connection, get_db
from schemas.indicare_ai_governance import AiGovernanceFilter
from services.indicare_ai_governance_dashboard_service import indicare_ai_governance_dashboard_service
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

router = APIRouter(prefix="/intelligence/governance/ai", tags=["intelligence-ai-governance"])


def _safe_int(value: int | None) -> int | None:
    if value is None:
        return None
    return int(value)


@router.get("/health")
def ai_governance_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    health = indicare_ai_governance_dashboard_service.build_health(conn=conn)
    return {"success": True, "data": health.model_dump(mode="json")}


@router.get("/dashboard")
def ai_governance_dashboard(
    period: str = Query(default="7d"),
    surface: str | None = None,
    home_id: int | None = None,
    risk_level: str | None = None,
    limit: int = Query(default=25, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    filters = AiGovernanceFilter(
        period=period,  # type: ignore[arg-type]
        surface=surface,  # type: ignore[arg-type]
        home_id=_safe_int(home_id) or _safe_int(current_user.get("home_id")),
        risk_level=risk_level,  # type: ignore[arg-type]
        limit=limit,
    )
    started = time.perf_counter()
    with acquire_optional_dashboard_connection(timeout=0.1) as conn:
        dashboard = indicare_ai_governance_dashboard_service.build_dashboard(
            filters,
            current_user,
            conn=conn,
        )
    route_ms = round((time.perf_counter() - started) * 1000, 2)
    logging.getLogger("indicare.ai_governance_dashboard").info(
        "ai_governance_dashboard endpoint=/intelligence/governance/ai/dashboard route_total_ms=%s degraded=%s degraded_response=%s warning_count=%s",
        route_ms,
        dashboard.degraded,
        bool(dashboard.degraded),
        len(dashboard.health.warnings or []),
    )
    return {
        "success": True,
        "data": dashboard.model_dump(mode="json"),
        "degraded": dashboard.degraded,
        "warning": dashboard.warning,
        "cache_status": "degraded" if dashboard.degraded else "hit",
    }


@router.get("/events")
def ai_governance_events(
    period: str = Query(default="7d"),
    surface: str | None = None,
    home_id: int | None = None,
    risk_level: str | None = None,
    event_type: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    filters = AiGovernanceFilter(
        period=period,  # type: ignore[arg-type]
        surface=surface,  # type: ignore[arg-type]
        home_id=_safe_int(home_id),
        risk_level=risk_level,  # type: ignore[arg-type]
        event_type=event_type,
        limit=limit,
    )
    events = indicare_ai_governance_event_service.get_recent_events(filters, conn=conn)
    return {
        "success": True,
        "data": {
            "events": [e.model_dump(mode="json") for e in events],
            "total": len(events),
            "summary": indicare_ai_governance_event_service.get_events_summary(filters, conn=conn),
        },
    }


@router.get("/alerts")
def ai_governance_alerts(
    period: str = Query(default="7d"),
    home_id: int | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = AiGovernanceFilter(
        period=period,  # type: ignore[arg-type]
        home_id=_safe_int(home_id) or _safe_int(current_user.get("home_id")),
    )
    alerts = indicare_ai_governance_dashboard_service.build_alerts(filters, current_user, conn=conn)
    return {
        "success": True,
        "data": {"alerts": [a.model_dump(mode="json") for a in alerts]},
    }


@router.get("/sources")
def ai_governance_sources(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    filters = AiGovernanceFilter()
    sources = indicare_ai_governance_dashboard_service.build_source_metrics(filters, current_user, conn=conn)
    return {"success": True, "data": sources.model_dump(mode="json")}


@router.get("/outputs")
def ai_governance_outputs(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = AiGovernanceFilter()
    outputs = indicare_ai_governance_dashboard_service.build_output_metrics(filters, current_user, conn=conn)
    return {"success": True, "data": outputs.model_dump(mode="json")}


@router.get("/costs")
def ai_governance_costs(
    period: str = Query(default="7d"),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = AiGovernanceFilter(period=period)  # type: ignore[arg-type]
    usage = indicare_ai_governance_dashboard_service.build_usage_metrics(filters, current_user, conn=conn)
    cost = indicare_ai_governance_dashboard_service.build_cost_metrics(filters, current_user, conn=conn)
    return {
        "success": True,
        "data": {
            "usage": usage.model_dump(mode="json"),
            "cost": cost.model_dump(mode="json"),
        },
    }


@router.get("/quality")
def ai_governance_quality(
    period: str = Query(default="7d"),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = AiGovernanceFilter(period=period)  # type: ignore[arg-type]
    quality = indicare_ai_governance_dashboard_service.build_quality_metrics(filters, current_user, conn=conn)
    citations = indicare_ai_governance_dashboard_service.build_citation_metrics(filters, current_user, conn=conn)
    return {
        "success": True,
        "data": {
            "quality": quality.model_dump(mode="json"),
            "citations": citations.model_dump(mode="json"),
        },
    }
