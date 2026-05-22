from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from core.router_loader import get_router_registry_summary, get_failed_routers, get_skipped_optional_routers
from services.operational_metrics_service import operational_metrics_service
from services.realtime_event_bus import REALTIME_EVENT_TYPES


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class PlatformHealthService:
    """Platform health and performance metrics without exposing care content."""

    def platform_health(self) -> dict[str, Any]:
        metrics = operational_metrics_service.health_summary()
        registry = get_router_registry_summary()
        return {
            "ok": metrics.get("ok", True),
            "generated_at": _now(),
            "status": "healthy" if metrics.get("ok") else "degraded",
            "websocket_health": metrics.get("websocket_health"),
            "queue_health": metrics.get("queue_health"),
            "export_health": metrics.get("export_health"),
            "autosave_health": metrics.get("autosave_health"),
            "router_registry": registry,
            "failed_routers": get_failed_routers(),
            "skipped_optional_routers": get_skipped_optional_routers(),
            "realtime_bus": {
                "supported_event_types": len(REALTIME_EVENT_TYPES),
            },
        }

    def performance_metrics(self, *, conn: Any | None = None) -> dict[str, Any]:
        metrics = operational_metrics_service.health_summary()
        route_timings = {
            key: value
            for key, value in (metrics.get("latency_metrics") or {}).items()
            if any(token in key for token in ("care_hub", "operational_feed", "chronology", "provider", "websocket", "stream"))
        }
        return {
            "ok": True,
            "generated_at": _now(),
            "route_timings_ms": route_timings,
            "cache_metrics": {key: value for key, value in metrics.get("queue_health", {}).items() if "cache" in key},
            "websocket_metrics": metrics.get("websocket_health"),
            "operational_feed_timings": {k: v for k, v in route_timings.items() if "feed" in k or "stream" in k},
            "care_hub_timings": {k: v for k, v in route_timings.items() if "care_hub" in k},
            "provider_aggregation_timings": {k: v for k, v in route_timings.items() if "provider" in k},
            "chronology_timings": {k: v for k, v in route_timings.items() if "chronology" in k},
            "recent_events": metrics.get("recent_events"),
        }


platform_health_service = PlatformHealthService()
