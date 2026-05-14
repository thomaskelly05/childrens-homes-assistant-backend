from __future__ import annotations

from typing import Any


OPERATIONAL_EVENT_CHANNELS = {
    "incidents": {"roles": {"support_worker", "senior", "manager", "registered_manager", "admin"}},
    "safeguarding": {"roles": {"manager", "registered_manager", "deputy_manager", "admin", "responsible_individual"}},
    "chronology": {"roles": {"support_worker", "senior", "manager", "registered_manager", "admin"}},
    "actions": {"roles": {"support_worker", "senior", "manager", "registered_manager", "admin"}},
    "notifications": {"roles": {"support_worker", "senior", "manager", "registered_manager", "admin"}},
    "shift_changes": {"roles": {"support_worker", "senior", "manager", "registered_manager", "admin"}},
    "escalations": {"roles": {"senior", "manager", "registered_manager", "deputy_manager", "admin", "responsible_individual"}},
}


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "viewer").lower().replace(" ", "_")


class OrbOperationalEventsService:
    """Permission-aware realtime event subscription metadata for Orb."""

    def subscriptions_for(self, *, current_user: dict[str, Any], context: dict[str, Any] | None = None) -> dict[str, Any]:
        role = _role(current_user)
        home_id = (context or {}).get("home_id") or current_user.get("home_id")
        channels = []
        for name, policy in OPERATIONAL_EVENT_CHANNELS.items():
            if role in policy["roles"] or role in {"super_admin", "provider_admin"}:
                channels.append(
                    {
                        "name": name,
                        "scope": {"home_id": home_id},
                        "mode": "quiet_relevant_only",
                        "spoken_notifications": name in {"safeguarding", "escalations"},
                    }
                )
        return {
            "channels": channels,
            "policy": {
                "rbac_scoped": True,
                "home_scoped": True,
                "quiet_by_default": True,
                "speak_only_when_relevant": True,
                "raw_audio_stored": False,
            },
        }


orb_operational_events_service = OrbOperationalEventsService()
