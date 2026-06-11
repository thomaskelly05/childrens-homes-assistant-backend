"""Safe OpenAI HTTP header handling — never forward browser or request headers."""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger("indicare.openai_headers")

MAX_HEADER_ENTRY_SIZE = 256
MAX_TOTAL_CUSTOM_HEADER_SIZE = 512

_BLOCKED_HEADER_NAMES = frozenset(
    {
        "authorization",
        "cookie",
        "set-cookie",
    }
)

_BLOCKED_HEADER_PREFIXES = (
    "x-forwarded-",
    "cf-",
    "render-",
)

_ALLOWED_HEADERS = frozenset(
    {
        "openai-organization",
        "openai-project",
    }
)

INFRASTRUCTURE_ERROR_PREFIX = "infrastructure_error:"
OPENAI_HEADERS_TOO_LARGE_CODE = "openai_request_headers_too_large"


def _safe_string(value: Any) -> str:
    return str(value or "").strip()


def sanitize_openai_headers(headers: dict[str, Any] | None) -> dict[str, str]:
    """Return only a tiny allowlist of safe OpenAI headers; drop everything else."""
    if not headers:
        return {}

    safe: dict[str, str] = {}
    total_size = 0

    for raw_key, raw_value in headers.items():
        if raw_value is None:
            continue
        key = _safe_string(raw_key).lower()
        value = _safe_string(raw_value)
        if not key or not value:
            continue
        if key in _BLOCKED_HEADER_NAMES:
            continue
        if any(key.startswith(prefix) for prefix in _BLOCKED_HEADER_PREFIXES):
            continue
        if key not in _ALLOWED_HEADERS:
            continue

        entry_size = len(key) + len(value)
        if entry_size > MAX_HEADER_ENTRY_SIZE:
            continue
        total_size += entry_size
        if total_size > MAX_TOTAL_CUSTOM_HEADER_SIZE:
            break
        safe[key] = value

    return safe


def header_size_summary(headers: dict[str, Any] | None) -> dict[str, int]:
    items = headers or {}
    return {
        "header_count": len(items),
        "safe_header_total_size": sum(len(str(k)) + len(str(v)) for k, v in items.items()),
    }


def is_openai_headers_too_large_error(exc: BaseException) -> bool:
    current: BaseException | None = exc
    seen: set[int] = set()

    while current is not None and id(current) not in seen:
        seen.add(id(current))
        status_code = getattr(current, "status_code", None)
        if status_code == 431:
            return True

        body = getattr(current, "body", None)
        if isinstance(body, dict):
            code = _safe_string(body.get("code")).lower()
            if code == "request_headers_too_large":
                return True
            nested = body.get("error")
            if isinstance(nested, dict):
                nested_code = _safe_string(nested.get("code")).lower()
                if nested_code == "request_headers_too_large":
                    return True

        message = _safe_string(current).lower()
        if "request_headers_too_large" in message:
            return True
        if "431" in message and "header" in message:
            return True

        current = current.__cause__ or current.__context__

    return False


def openai_header_error_metadata(exc: BaseException, *, headers: dict[str, Any] | None = None) -> dict[str, int]:
    summary = header_size_summary(headers)
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        for key in ("header_count", "safe_header_total_size"):
            value = body.get(key)
            if isinstance(value, int) and value >= 0:
                summary[key] = value
    return summary


def log_orb_openai_header_too_large(
    *,
    scenario_id: str,
    scenario_category: str,
    pack: str,
    mode: str,
    header_count: int | None = None,
    safe_header_total_size: int | None = None,
) -> None:
    logger.warning(
        "orb_openai_header_too_large scenario_id=%s scenario_category=%s pack=%s mode=%s "
        "header_count=%s safe_header_total_size=%s",
        scenario_id,
        scenario_category,
        pack,
        mode,
        header_count if header_count is not None else "unknown",
        safe_header_total_size if safe_header_total_size is not None else "unknown",
    )


def infrastructure_error_message(code: str = OPENAI_HEADERS_TOO_LARGE_CODE) -> str:
    return f"{INFRASTRUCTURE_ERROR_PREFIX} {code}"


def is_infrastructure_error_message(message: str | None) -> bool:
    return _safe_string(message).startswith(INFRASTRUCTURE_ERROR_PREFIX)


def infrastructure_error_code(message: str | None) -> str | None:
    text = _safe_string(message)
    if not text.startswith(INFRASTRUCTURE_ERROR_PREFIX):
        return None
    code = text[len(INFRASTRUCTURE_ERROR_PREFIX) :].strip()
    return code or None


def build_openai_client_kwargs(
    *,
    api_key: str | None = None,
    base_url: str | None = None,
    organisation: str | None = None,
    project: str | None = None,
    timeout: float | None = None,
    default_headers: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build kwargs for OpenAI SDK clients with no forwarded request headers."""
    resolved_key = _safe_string(api_key or os.getenv("OPENAI_API_KEY"))
    if not resolved_key:
        raise RuntimeError("OPENAI_API_KEY is missing")

    kwargs: dict[str, Any] = {"api_key": resolved_key}

    resolved_base_url = _safe_string(base_url or os.getenv("OPENAI_BASE_URL"))
    if resolved_base_url:
        kwargs["base_url"] = resolved_base_url

    resolved_org = _safe_string(organisation or os.getenv("OPENAI_ORG_ID"))
    if resolved_org:
        kwargs["organization"] = resolved_org

    resolved_project = _safe_string(project or os.getenv("OPENAI_PROJECT_ID"))
    if resolved_project:
        kwargs["project"] = resolved_project

    if timeout is not None:
        kwargs["timeout"] = timeout

    safe_headers = sanitize_openai_headers(default_headers)
    if safe_headers:
        kwargs["default_headers"] = safe_headers

    return kwargs


def create_sync_openai_client(**kwargs: Any):
    from openai import OpenAI

    return OpenAI(**build_openai_client_kwargs(**kwargs))


def create_async_openai_client(**kwargs: Any):
    from openai import AsyncOpenAI

    return AsyncOpenAI(**build_openai_client_kwargs(**kwargs))


def reset_cached_openai_clients() -> None:
    """Drop cached OpenAI clients so a retry uses freshly constructed minimal headers."""
    try:
        from assistant.llm_provider import reset_llm_provider

        reset_llm_provider()
    except Exception:
        logger.debug("reset_cached_openai_clients: llm_provider reset skipped", exc_info=True)

    try:
        from services.ai_gateway_service import ai_gateway_service

        ai_gateway_service._client = None  # noqa: SLF001 — intentional cache bust for retry
    except Exception:
        logger.debug("reset_cached_openai_clients: ai_gateway reset skipped", exc_info=True)
