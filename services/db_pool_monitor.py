from __future__ import annotations

from typing import Any

from db.connection import pool_status


def db_pool_snapshot() -> dict[str, Any]:
    status = pool_status()
    max_connections = int(status.get("max") or 0)
    used = int(status.get("used") or 0)
    available = int(status.get("available") or 0)
    waiting = int(status.get("waiting") or 0)
    saturation = round((used / max_connections) * 100, 2) if max_connections else 0.0
    return {
        **status,
        "used": used,
        "available": available,
        "waiting": waiting,
        "saturation_pct": saturation,
        "saturated": saturation >= 85.0,
        "degraded": saturation >= 70.0,
        "acquisition_failures": int(status.get("acquisition_failures") or 0),
    }


def pool_is_saturated(threshold_pct: float = 85.0) -> bool:
    return float(db_pool_snapshot().get("saturation_pct") or 0.0) >= threshold_pct
