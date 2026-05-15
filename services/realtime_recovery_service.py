from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from services.operational_metrics_service import operational_metrics_service
from services.orb_session_store import orb_session_store
from services.realtime_scaling_service import realtime_scaling_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RealtimeRecoveryService:
    """Heartbeat and reconnect recovery for home-scoped websocket sessions."""

    def heartbeat(
        self,
        *,
        session_id: str,
        socket_id: str,
        user_id: int | str | None,
        home_id: int | str | None,
        worker_id: str,
    ) -> dict[str, Any]:
        binding = orb_session_store.bind_socket(
            session_id=session_id,
            socket_id=socket_id,
            user_id=user_id,
            home_id=home_id,
            worker_id=worker_id,
        )
        operational_metrics_service.increment("websocket.heartbeat", dimensions={"home_id": home_id, "worker_id": worker_id})
        return {"ok": True, "binding": binding, "heartbeat_at": _now()}

    def reconnect(
        self,
        *,
        session_id: str,
        attempts: int,
        last_sequence: int | None = None,
        home_id: int | str | None = None,
    ) -> dict[str, Any]:
        plan = realtime_scaling_service.reconnect_plan(attempts=attempts, last_sequence=last_sequence)
        state = orb_session_store.load_realtime_state(session_id) or {}
        operational_metrics_service.increment("reconnect.attempt", dimensions={"home_id": home_id, "request_snapshot": plan["request_snapshot"]})
        return {
            "ok": True,
            "session_id": session_id,
            "plan": plan,
            "last_known_phase": state.get("phase"),
            "resume_from_sequence": plan["resume_from_sequence"],
            "child_scope": {
                "selected_young_person_id": (state.get("active_context_references") or {}).get("selected_young_person_id"),
                "cross_child_lookup_allowed": False,
            },
            "bindings": orb_session_store.socket_bindings(session_id),
        }

    def websocket_health(self, *, session_id: str | None = None) -> dict[str, Any]:
        if session_id:
            bindings = orb_session_store.socket_bindings(session_id)
            return {"ok": bool(bindings), "session_id": session_id, "active_bindings": len(bindings), "bindings": bindings}
        health = orb_session_store.health()
        return {"ok": health["backend"] != "memory" or not health["redis_configured"], **health}


realtime_recovery_service = RealtimeRecoveryService()
