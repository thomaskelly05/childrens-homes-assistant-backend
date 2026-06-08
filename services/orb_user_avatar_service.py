from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from psycopg2.extras import RealDictCursor

ALLOWED_AVATAR_HOST_SUFFIXES = (
    "googleusercontent.com",
    "ggpht.com",
    "graph.microsoft.com",
    "microsoft.com",
    "live.com",
    "office.com",
    "office365.com",
    "outlook.com",
    "apple.com",
)

UNSAFE_AVATAR_QUERY_KEYS = frozenset(
    {"access_token", "token", "id_token", "refresh_token", "code", "session"}
)


def _host_allowed(hostname: str) -> bool:
    host = (hostname or "").strip().lower().rstrip(".")
    if not host:
        return False
    return any(host == suffix or host.endswith(f".{suffix}") for suffix in ALLOWED_AVATAR_HOST_SUFFIXES)


def validate_avatar_url(url: str | None) -> str | None:
    """Return a safe HTTPS avatar URL or None."""
    raw = str(url or "").strip()
    if not raw or len(raw) > 2048:
        return None
    if any(marker in raw.lower() for marker in ("access_token=", "refresh_token=", "id_token=")):
        return None
    try:
        parsed = urlparse(raw)
    except ValueError:
        return None
    if parsed.scheme != "https":
        return None
    if not _host_allowed(parsed.hostname or ""):
        return None
    for key in parsed.query.split("&"):
        if not key:
            continue
        name = key.split("=", 1)[0].strip().lower()
        if name in UNSAFE_AVATAR_QUERY_KEYS:
            return None
    return raw


def extract_provider_avatar_url(provider: str, profile: dict[str, Any]) -> str | None:
    key = provider.strip().lower()
    candidates: list[str | None] = []
    if key == "google":
        candidates.append(profile.get("picture"))
    elif key == "microsoft":
        candidates.extend([profile.get("picture"), profile.get("photo")])
    elif key == "apple":
        candidates.append(profile.get("picture"))
    for candidate in candidates:
        safe = validate_avatar_url(str(candidate) if candidate else None)
        if safe:
            return safe
    return None


def get_user_display_profile(conn, user_id: int) -> dict[str, str | None]:
    """Safe ORB display fields from linked OAuth accounts."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT provider, metadata
            FROM orb_oauth_accounts
            WHERE user_id = %s
            ORDER BY updated_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall() or []

    avatar_url: str | None = None
    auth_provider: str | None = None
    for row in rows:
        provider = str(row.get("provider") or "").strip().lower() or None
        metadata = row.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}
        if not auth_provider and provider:
            auth_provider = provider
        candidate = validate_avatar_url(metadata.get("avatar_url"))
        if candidate:
            avatar_url = candidate
            auth_provider = provider or auth_provider
            break

    return {"avatar_url": avatar_url, "auth_provider": auth_provider}


def enrich_user_summary(user: dict[str, Any] | None, conn, user_id: int | None) -> dict[str, Any] | None:
    if not user:
        return None
    summary = {
        "id": user.get("id") or user.get("user_id"),
        "email": user.get("email"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "role": user.get("role"),
        "avatar_url": None,
        "auth_provider": None,
    }
    if user_id is not None:
        display = get_user_display_profile(conn, int(user_id))
        summary["avatar_url"] = display.get("avatar_url")
        summary["auth_provider"] = display.get("auth_provider")
    return summary
