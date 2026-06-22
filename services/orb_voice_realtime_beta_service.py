"""ORB Voice realtime beta scaffolding — safe status without exposing secrets."""

from __future__ import annotations

import os
from typing import Any

from services.orb_voice_realtime_config import _openai_realtime_configured


def realtime_beta_status_payload() -> dict[str, Any]:
    """Report whether full realtime or hybrid beta is available; always safe to call."""
    configured = _openai_realtime_configured()
    hybrid_enabled = os.environ.get("ORB_VOICE_HYBRID_BETA", "1").strip().lower() not in {
        "0",
        "false",
        "off",
        "no",
    }
    if configured:
        return {
            "available": True,
            "reason": "configured",
            "mode": "beta",
            "transport": "openai_realtime",
            "hybridSpeech": hybrid_enabled,
            "fallback": "voice_v2",
        }
    return {
        "available": False,
        "reason": "not_configured",
        "mode": "fallback",
        "transport": None,
        "hybridSpeech": hybrid_enabled,
        "fallback": "voice_v2",
    }


def realtime_beta_token_payload(*, user_id: int | None = None) -> dict[str, Any]:
    """Token/session hint for frontend — never returns API secrets."""
    status = realtime_beta_status_payload()
    if not status.get("available"):
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
