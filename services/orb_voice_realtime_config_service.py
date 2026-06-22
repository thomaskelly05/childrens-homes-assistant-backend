"""Canonical ORB Voice realtime environment resolver — normalises legacy and current env names."""

from __future__ import annotations

import os
from typing import Any, Literal

OrbRealtimeProvider = Literal["openai", "none"]
OrbRealtimeMode = Literal["webrtc", "hybrid", "fallback"]


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _normalise_provider(raw: str | None) -> str:
    value = (raw or "browser_fallback").strip().lower()
    aliases = {
        "openai_realtime": "openai",
        "openai-realtime": "openai",
        "browser": "browser_fallback",
        "browser_fallback": "browser_fallback",
        "none": "none",
        "off": "none",
        "disabled": "none",
    }
    return aliases.get(value, value)


def _resolve_realtime_provider() -> str:
    return _normalise_provider(
        os.getenv("ORB_VOICE_REALTIME_PROVIDER") or os.getenv("ORB_VOICE_PROVIDER")
    )


def _default_session_url() -> str:
    return (
        os.getenv("OPENAI_REALTIME_SESSION_URL", "https://api.openai.com/v1/realtime/sessions").strip()
        or "https://api.openai.com/v1/realtime/sessions"
    )


def _default_client_secret_url() -> str:
    return (
        os.getenv(
            "OPENAI_REALTIME_CLIENT_SECRET_URL",
            "https://api.openai.com/v1/realtime/client_secrets",
        ).strip()
        or "https://api.openai.com/v1/realtime/client_secrets"
    )


def _default_realtime_url() -> str:
    return (
        os.getenv("OPENAI_REALTIME_URL", "https://api.openai.com/v1/realtime").strip()
        or "https://api.openai.com/v1/realtime"
    )


def _hybrid_speech_enabled() -> bool:
    return os.environ.get("ORB_VOICE_HYBRID_BETA", "1").strip().lower() not in {
        "0",
        "false",
        "off",
        "no",
    }


def resolve_orb_voice_realtime_config() -> dict[str, Any]:
    """Resolve all relevant realtime env vars into one canonical structure (server-side only)."""
    provider = _resolve_realtime_provider()
    model = (os.getenv("ORB_REALTIME_MODEL") or os.getenv("INDICARE_REALTIME_MODEL") or "gpt-realtime").strip()
    transcription_model = (os.getenv("ORB_REALTIME_TRANSCRIPTION_MODEL") or "whisper-1").strip()
    session_url = _default_session_url()
    client_secret_url = _default_client_secret_url()
    realtime_url = _default_realtime_url()

    base = {
        "model": model,
        "transcription_model": transcription_model,
        "session_url": session_url,
        "client_secret_url": client_secret_url,
        "realtime_url": realtime_url,
    }

    if not _env_bool("ORB_REALTIME_ENABLED", default=True):
        return {
            **base,
            "enabled": False,
            "provider": "none",
            "mode": "fallback",
            "reason": "disabled",
        }

    if provider in {"browser_fallback", "none"}:
        return {
            **base,
            "enabled": False,
            "provider": "none",
            "mode": "fallback",
            "reason": "not_configured",
        }

    if provider != "openai":
        return {
            **base,
            "enabled": False,
            "provider": "none",
            "mode": "fallback",
            "reason": "provider_not_supported",
        }

    if not os.getenv("OPENAI_API_KEY", "").strip():
        return {
            **base,
            "enabled": False,
            "provider": "none",
            "mode": "fallback",
            "reason": "missing_api_key",
        }

    if not session_url or not client_secret_url:
        return {
            **base,
            "enabled": False,
            "provider": "none",
            "mode": "fallback",
            "reason": "missing_realtime_urls",
        }

    if not model:
        return {
            **base,
            "enabled": False,
            "provider": "none",
            "mode": "fallback",
            "reason": "missing_model",
        }

    return {
        **base,
        "enabled": True,
        "provider": "openai",
        "mode": "webrtc",
        "reason": None,
    }


def is_openai_realtime_available() -> bool:
    cfg = resolve_orb_voice_realtime_config()
    return bool(cfg.get("enabled") and cfg.get("provider") == "openai" and cfg.get("mode") == "webrtc")


def public_realtime_status_payload() -> dict[str, Any]:
    """Safe client-facing realtime status — never includes API keys or secrets."""
    cfg = resolve_orb_voice_realtime_config()
    available = is_openai_realtime_available()
    hybrid = _hybrid_speech_enabled()
    reason = cfg.get("reason")

    if available:
        return {
            "available": True,
            "provider": "openai",
            "mode": "webrtc",
            "model": cfg.get("model"),
            "transcriptionModel": cfg.get("transcription_model"),
            "hybridSpeech": hybrid,
            "fallback": "voice_v2",
            "reason": None,
            "transport": "openai_realtime",
        }

    return {
        "available": False,
        "provider": "none",
        "mode": "fallback",
        "hybridSpeech": hybrid,
        "fallback": "voice_v2",
        "reason": reason or "not_configured",
        "transport": None,
    }
