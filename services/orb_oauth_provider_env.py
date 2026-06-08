from __future__ import annotations

import os

MICROSOFT_GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"
EXPECTED_MICROSOFT_REDIRECT_URI = (
    "https://api.indicare.co.uk/orb/standalone/auth/oauth/microsoft/callback"
)


def _truthy_env(name: str, *, default: bool = False) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _coalesce_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def microsoft_auth_enabled() -> bool:
    explicit = os.getenv("MICROSOFT_AUTH_ENABLED", "").strip().lower()
    if explicit in {"0", "false", "no", "off"}:
        return False
    if explicit in {"1", "true", "yes", "on"}:
        return True
    return bool(_coalesce_env("MICROSOFT_CLIENT_ID", "OAUTH_MICROSOFT_CLIENT_ID"))


def apple_auth_enabled() -> bool:
    return _truthy_env("APPLE_AUTH_ENABLED", default=False)


def microsoft_client_id() -> str:
    return _coalesce_env("MICROSOFT_CLIENT_ID", "OAUTH_MICROSOFT_CLIENT_ID")


def microsoft_client_secret() -> str:
    return _coalesce_env("MICROSOFT_CLIENT_SECRET", "OAUTH_MICROSOFT_CLIENT_SECRET")


def microsoft_redirect_uri() -> str:
    return _coalesce_env("MICROSOFT_REDIRECT_URI", "OAUTH_MICROSOFT_REDIRECT_URI")


def microsoft_tenant_id() -> str:
    return _coalesce_env("MICROSOFT_TENANT_ID", "OAUTH_MICROSOFT_TENANT") or "common"
