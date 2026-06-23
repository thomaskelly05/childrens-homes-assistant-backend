"""User-visible answer sanitization when AI provider is mock or unavailable."""

from __future__ import annotations

import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE = (
    "ORB could not complete this response. Please try again or contact support if this continues."
)

_MOCK_LEAKAGE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"configure\s+openai_api_key", re.IGNORECASE),
    re.compile(r"orb\s+mock\s+engine\s+response", re.IGNORECASE),
    re.compile(r"\bmock\s+provider\b", re.IGNORECASE),
    re.compile(r"\bplaceholder\s+provider\b", re.IGNORECASE),
)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _app_env() -> str:
    return str(os.getenv("APP_ENV") or os.getenv("ENV") or "development").strip().lower()


def is_sign_off_or_deployed_context() -> bool:
    """True when user-visible answers must never leak mock/provider config text."""
    if _env_bool("ORB_LIVE_SIGN_OFF"):
        return True
    if _env_bool("AI_PROVIDER_STRICT"):
        return True
    env = _app_env()
    return env in {"production", "staging", "preview"}


def is_mock_provider_leakage(text: str) -> bool:
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    return any(pattern.search(cleaned) for pattern in _MOCK_LEAKAGE_PATTERNS)


def is_placeholder_openai_key() -> bool:
    key = str(os.getenv("OPENAI_API_KEY") or "").strip()
    if not key:
        return True
    lowered = key.lower()
    return lowered.startswith("replace") or lowered in {"replace-with-openai-key", "replace-me"}


def openai_key_configured() -> bool:
    return not is_placeholder_openai_key()


def assert_live_provider_for_signoff() -> None:
    """Raise when a live-LLM sign-off run cannot use a real provider."""
    if not _env_bool("ORB_LIVE_SIGN_OFF"):
        return
    if not openai_key_configured():
        raise RuntimeError(
            "ORB_LIVE_SIGN_OFF requires a configured OPENAI_API_KEY (not placeholder or empty)."
        )
    if not _env_bool("AI_PROVIDER_STRICT"):
        raise RuntimeError(
            "ORB_LIVE_SIGN_OFF requires AI_PROVIDER_STRICT=true to block mock fallback."
        )


def sanitize_user_visible_provider_answer(
    text: str,
    *,
    provider: str | None = None,
    error_detail: str | None = None,
    log_context: dict[str, Any] | None = None,
) -> tuple[str, str | None]:
    """
    Replace mock/provider config leakage with a safe user message.
    Returns (sanitized_text, internal_issue_code).
    """
    cleaned = (text or "").strip()
    provider_name = str(provider or "").strip().lower()
    issue: str | None = None

    if provider_name == "mock":
        issue = "mock_provider"
    elif error_detail in {"provider_unavailable", "openai_unavailable"}:
        issue = str(error_detail)
    elif is_mock_provider_leakage(cleaned):
        issue = "mock_leakage_text"

    if not issue:
        return text, None

    if not is_sign_off_or_deployed_context():
        return text, issue

    ctx = log_context or {}
    logger.warning(
        "orb_provider_user_answer_sanitized issue=%s provider=%s chars=%s route=%s",
        issue,
        provider_name or "unknown",
        len(cleaned),
        ctx.get("route"),
    )
    return ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE, issue
