from __future__ import annotations

from typing import Any

from services.intelligence.projection_snapshot_service import (
    ProjectionSnapshot,
    projection_snapshot_key,
    projection_snapshot_service,
)
from services.risk_intelligence_language import now_iso


class IntelligenceSnapshotService:
    """Lightweight intelligence snapshot cache using operational_projection_snapshots."""

    def build_snapshot_key(
        self,
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        mode: str = "home",
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> str:
        return projection_snapshot_key(
            "intelligence",
            "spine",
            mode,
            "home",
            home_id,
            "child",
            child_id,
            "staff",
            staff_id,
            "from",
            date_from or "",
            "to",
            date_to or "",
        )

    def get_latest_snapshot(self, key: str) -> dict[str, Any] | None:
        try:
            cached = projection_snapshot_service.get(key)
            if cached and not cached.get("stale") and isinstance(cached.get("payload"), dict):
                return cached
        except Exception:
            return None
        return None

    def save_snapshot(
        self,
        *,
        key: str,
        payload: dict[str, Any],
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        mode: str = "home",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            return projection_snapshot_service.put(
                ProjectionSnapshot(
                    projection_key=key,
                    projection_type="intelligence_spine",
                    domain="intelligence",
                    payload=payload,
                    home_id=int(home_id) if home_id not in (None, "") else None,
                    young_person_id=int(child_id) if child_id not in (None, "") else None,
                    staff_id=int(staff_id) if staff_id not in (None, "") else None,
                    metadata=metadata or {"mode": mode, "saved_at": now_iso()},
                )
            )
        except Exception:
            return {"stored": False, "projection_key": key}


intelligence_snapshot_service = IntelligenceSnapshotService()
