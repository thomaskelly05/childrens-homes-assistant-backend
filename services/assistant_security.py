from __future__ import annotations

from typing import Any

PROMPT_INJECTION_PATTERNS = (
    "ignore previous instructions",
    "ignore all previous instructions",
    "reveal system prompt",
    "show system prompt",
    "print system prompt",
    "bypass permissions",
    "bypass access control",
    "act as admin",
    "elevate role",
    "role: admin",
    "dump database",
    "exfiltrate",
    "hidden context",
    "developer message",
)

VALID_OS_SCOPES = {"child", "home", "quality", "ofsted"}
SCOPE_TYPE_MAP = {
    "child": "young_person",
    "home": "home",
    "quality": "quality",
    "ofsted": "quality",
}

PROVIDER_LEVEL_ROLES = {"admin", "provider_admin", "ri", "responsible_individual"}

ROLE_SCOPE_ACCESS: dict[str, set[str]] = {
    "staff": {"child", "home"},
    "senior": {"child", "home"},
    "manager": {"child", "home", "quality"},
    "ri": {"child", "home", "quality", "ofsted"},
    "responsible_individual": {"child", "home", "quality", "ofsted"},
    "provider_admin": {"child", "home", "quality", "ofsted"},
    "admin": {"child", "home", "quality", "ofsted"},
}


def safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def safe_int_list(value: Any) -> list[int]:
    if not isinstance(value, list):
        return []
    out: list[int] = []
    for item in value:
        parsed = safe_int(item)
        if parsed is not None:
            out.append(parsed)
    return out


def normalise_role(role: Any) -> str:
    return safe_string(role).lower()


def normalise_os_scope(scope: Any) -> str:
    raw = safe_string(scope).lower()
    if raw in {"young_person", "young-person"}:
        raw = "child"
    if raw in VALID_OS_SCOPES:
        return raw
    return "child"


def scope_to_scope_type(scope: str) -> str:
    return SCOPE_TYPE_MAP.get(scope, "young_person")


def role_can_access_scope(role: str, scope: str) -> bool:
    allowed = ROLE_SCOPE_ACCESS.get(normalise_role(role), set())
    return scope in allowed


def is_provider_level_role(role: str) -> bool:
    return normalise_role(role) in PROVIDER_LEVEL_ROLES


def contains_prompt_injection_attempt(text: str) -> bool:
    lowered = safe_string(text).lower()
    if not lowered:
        return False
    return any(pattern in lowered for pattern in PROMPT_INJECTION_PATTERNS)


def normalise_history(history: Any, *, max_items: int = 20, max_chars: int = 3000) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []

    cleaned: list[dict[str, str]] = []
    for item in history[:max_items]:
        if not isinstance(item, dict):
            continue

        role = safe_string(item.get("role")).lower()
        content = safe_string(item.get("content") or item.get("message"))
        if role not in {"user", "assistant", "system"} or not content:
            continue

        cleaned.append({"role": role, "content": content[:max_chars]})

    return cleaned
