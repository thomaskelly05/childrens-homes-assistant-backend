from __future__ import annotations

import logging
import re
from collections.abc import Mapping
from typing import Any


SENSITIVE_FIELD_NAMES = {
    "authorization",
    "cookie",
    "set-cookie",
    "x-csrf-token",
    "csrf_token",
    "token",
    "access_token",
    "refresh_token",
    "session",
    "session_id",
    "password",
    "password_hash",
    "secret",
    "api_key",
    "passkey",
    "credential",
    "document_text",
    "raw_text",
    "extracted_text",
    "prompt",
    "question",
    "response",
    "answer",
    "content",
}

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?44\s?7\d{3}|\(?0\d{2,4}\)?)[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}\b")
DOB_RE = re.compile(r"\b(?:dob|date of birth)\s*[:\-]?\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b", re.IGNORECASE)
TOKEN_RE = re.compile(r"\b(?:bearer|token|session)\s+[A-Za-z0-9._\-+/=]{16,}\b", re.IGNORECASE)


def redact_text(value: Any, *, redact_prompt_text: bool = True) -> str:
    text = "" if value is None else str(value)
    text = TOKEN_RE.sub("[REDACTED_TOKEN]", text)
    text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    text = PHONE_RE.sub("[REDACTED_PHONE]", text)
    text = DOB_RE.sub("[REDACTED_DOB]", text)
    if redact_prompt_text and len(text) > 512:
        return f"[REDACTED_TEXT:{len(text)}]"
    return text


def safe_log_value(key: str, value: Any, *, redact_prompt_text: bool = True) -> Any:
    key_norm = str(key or "").strip().lower().replace("-", "_")
    if key_norm in SENSITIVE_FIELD_NAMES or any(marker in key_norm for marker in ("token", "cookie", "secret", "password")):
        if isinstance(value, (dict, list, tuple, set)):
            return "[REDACTED]"
        if value in (None, ""):
            return value
        return "[REDACTED]"
    if isinstance(value, Mapping):
        return safe_log_dict(value, redact_prompt_text=redact_prompt_text)
    if isinstance(value, list):
        return [safe_log_value(key, item, redact_prompt_text=redact_prompt_text) for item in value[:20]]
    if isinstance(value, str):
        return redact_text(value, redact_prompt_text=redact_prompt_text)
    return value


def safe_log_dict(data: Mapping[str, Any] | None, *, redact_prompt_text: bool = True) -> dict[str, Any]:
    if not data:
        return {}
    return {
        str(key): safe_log_value(str(key), value, redact_prompt_text=redact_prompt_text)
        for key, value in data.items()
    }


def safe_log(logger: logging.Logger, level: int, message: str, **metadata: Any) -> None:
    logger.log(level, "%s metadata=%s", message, safe_log_dict(metadata))
