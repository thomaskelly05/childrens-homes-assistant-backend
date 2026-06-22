"""ORB Voice realtime beta — status/token surfaces backed by canonical env config."""

from __future__ import annotations

from typing import Any

from services.orb_voice_realtime_config_service import (
    is_openai_realtime_available,
    public_realtime_status_payload,
)


def realtime_beta_status_payload() -> dict[str, Any]:
    """Report whether full realtime or hybrid beta is available; always safe to call."""
    return public_realtime_status_payload()


def realtime_beta_token_payload(*, user_id: int | None = None) -> dict[str, Any]:
    """Token/session hint for frontend — never returns provider API secrets."""
    status = public_realtime_status_payload()
    if not is_openai_realtime_available():
        return {
            "ok": False,
            "reason": status.get("reason") or "not_configured",
            "fallback": "voice_v2",
        }
    return {
        "ok": True,
        "tokenType": "ephemeral_session",
        "useSessionEndpoint": "/orb/voice/realtime/session",
        "fallback": "voice_v2",
        "userScoped": bool(user_id),
    }
