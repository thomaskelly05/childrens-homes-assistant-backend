from __future__ import annotations

import re
from typing import Any

PROMPT_INJECTION_PATTERNS = (
    "ignore previous instructions",
    "ignore all previous instructions",
    "ignore the above",
    "ignore your instructions",
    "forget previous instructions",
    "forget all previous instructions",
    "disregard previous instructions",
    "disregard all previous instructions",
    "override system prompt",
    "override developer message",
    "reveal system prompt",
    "show system prompt",
    "print system prompt",
    "display system prompt",
    "what is your system prompt",
    "show hidden prompt",
    "show hidden instructions",
    "hidden context",
    "developer message",
    "system message",
    "bypass permissions",
    "bypass access control",
    "bypass safety",
    "bypass safeguards",
    "act as admin",
    "pretend to be admin",
    "elevate role",
    "role: admin",
    "make me admin",
    "dump database",
    "export database",
    "show database",
    "exfiltrate",
    "exfiltration",
    "leak data",
    "show secrets",
    "print secrets",
    "api key",
    "session secret",
    "database url",
)

PROMPT_INJECTION_REGEXES = (
    re.compile(r"\bignore\b.{0,80}\b(instructions|system|developer|rules)\b", re.I),
    re.compile(r"\b(disregard|forget|override)\b.{0,80}\b(instructions|system|developer|rules)\b", re.I),
    re.compile(r"\b(show|print|reveal|display)\b.{0,80}\b(system prompt|developer message|hidden instructions|hidden context)\b", re.I),
    re.compile(r"\b(role|act)\s*:\s*(admin|system|developer)\b", re.I),
    re.compile(r"\b(bypass|disable|remove)\b.{0,80}\b(access control|permissions|safety|guardrails|safeguards)\b", re.I),
    re.compile(r"\b(dump|export|exfiltrate|leak)\b.{0,80}\b(database|data|secrets|keys|tokens)\b", re.I),
)

VALID_OS_SCOPES = {"child", "home", "quality", "ofsted"}

SCOPE_TYPE_MAP = {
    "child": "young_person",
    "home": "home",
    "quality": "quality",
    "ofsted": "quality",
}

ROLE_ALIASES = {
    "rsw": "staff",
    "residential_support_worker": "staff",
    "residential support worker": "staff",
    "support_worker": "staff",
    "support worker": "staff",
    "care_staff": "staff",
    "care staff": "staff",
    "senior_rsw": "senior",
    "senior residential support worker": "senior",
    "team_leader": "senior",
    "team leader": "senior",
    "shift_leader": "senior",
    "shift leader": "senior",
    "deputy": "manager",
    "deputy_manager": "manager",
    "deputy manager": "manager",
    "registered_manager": "manager",
    "registered manager": "manager",
    "home_manager": "manager",
    "home manager": "manager",
    "responsible individual": "responsible_individual",
    "responsible_individual": "responsible_individual",
    "ri": "ri",
    "provider admin": "provider_admin",
    "provider_admin": "provider_admin",
    "super admin": "super_admin",
    "super_admin": "super_admin",
    "superadmin": "super_admin",
    "administrator": "admin",
}

PROVIDER_LEVEL_ROLES = {
    "admin",
    "provider_admin",
    "ri",
    "responsible_individual",
    "super_admin",
}

ROLE_SCOPE_ACCESS: dict[str, set[str]] = {
    "staff": {"child", "home"},
    "senior": {"child", "home"},
    "manager": {"child", "home", "quality", "ofsted"},
    "ri": {"child", "home", "quality", "ofsted"},
    "responsible_individual": {"child", "home", "quality", "ofsted"},
    "provider_admin": {"child", "home", "quality", "ofsted"},
    "admin": {"child", "home", "quality", "ofsted"},
    "super_admin": {"child", "home", "quality", "ofsted"},
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
    seen: set[int] = set()

    for item in value:
        parsed = safe_int(item)
        if parsed is None:
            continue
        if parsed in seen:
            continue
        seen.add(parsed)
        out.append(parsed)

    return out


def normalise_role(role: Any) -> str:
    raw = safe_string(role).lower()
    raw = raw.replace("-", "_").strip()

    if raw in ROLE_ALIASES:
        return ROLE_ALIASES[raw]

    raw_spaces = raw.replace("_", " ")
    if raw_spaces in ROLE_ALIASES:
        return ROLE_ALIASES[raw_spaces]

    return raw


def normalise_os_scope(scope: Any) -> str:
    raw = safe_string(scope).lower().replace("_", "-")

    if raw in {"young-person", "young-persons", "young-people", "young-person-record"}:
        raw = "child"

    if raw in {"home-dashboard", "home-os"}:
        raw = "home"

    if raw in {"provider-quality", "quality-dashboard", "quality-os"}:
        raw = "quality"

    if raw in {"ofsted-dashboard", "inspection"}:
        raw = "ofsted"

    if raw in VALID_OS_SCOPES:
        return raw

    return "child"


def scope_to_scope_type(scope: str) -> str:
    safe_scope = normalise_os_scope(scope)
    return SCOPE_TYPE_MAP.get(safe_scope, "young_person")


def role_can_access_scope(role: str, scope: str) -> bool:
    safe_role = normalise_role(role)
    safe_scope = normalise_os_scope(scope)
    allowed = ROLE_SCOPE_ACCESS.get(safe_role, set())
    return safe_scope in allowed


def is_provider_level_role(role: str) -> bool:
    return normalise_role(role) in PROVIDER_LEVEL_ROLES


def contains_prompt_injection_attempt(text: str) -> bool:
    lowered = safe_string(text).lower()

    if not lowered:
        return False

    if any(pattern in lowered for pattern in PROMPT_INJECTION_PATTERNS):
        return True

    return any(regex.search(lowered) for regex in PROMPT_INJECTION_REGEXES)


def normalise_history(
    history: Any,
    *,
    max_items: int = 20,
    max_chars: int = 3000,
) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []

    cleaned: list[dict[str, str]] = []

    for item in history[:max_items]:
        if not isinstance(item, dict):
            continue

        role = safe_string(item.get("role")).lower()
        content = safe_string(item.get("content") or item.get("message"))

        if role not in {"user", "assistant"}:
            continue

        if not content:
            continue

        if contains_prompt_injection_attempt(content):
            continue

        cleaned.append(
            {
                "role": role,
                "content": content[:max_chars],
            }
        )

    return cleaned