from __future__ import annotations

import json
import logging
import os
import secrets
import urllib.parse
from dataclasses import dataclass
from typing import Any

import httpx

from auth.passwords import hash_password
from services.orb_subscription_plan_service import oauth_provider_configured

logger = logging.getLogger(__name__)

ORB_OAUTH_PROVIDERS = frozenset({"google", "microsoft", "apple"})
ORB_OAUTH_SESSION_STATE_KEY = "orb_oauth_state"
ORB_OAUTH_SESSION_RETURN_KEY = "orb_oauth_return_url"
ORB_OAUTH_SESSION_PROVIDER_KEY = "orb_oauth_provider"

ALLOWED_RETURN_PREFIXES = ("/orb", "/orb/onboarding", "/orb/access", "/orb/billing")


@dataclass(frozen=True)
class OrbOAuthProviderConfig:
    name: str
    client_id: str
    client_secret: str
    redirect_uri: str
    authorize_url: str
    token_url: str
    userinfo_url: str | None = None
    scopes: tuple[str, ...] = ()
    extra_authorize_params: dict[str, str] | None = None


def _normalise_return_url(value: str | None) -> str:
    raw = str(value or "/orb").strip()
    if not raw.startswith("/"):
        return "/orb"
    if raw.startswith("//"):
        return "/orb"
    for prefix in ALLOWED_RETURN_PREFIXES:
        if raw == prefix or raw.startswith(f"{prefix}/") or raw.startswith(f"{prefix}?"):
            return raw
    return "/orb"


def provider_enabled(provider: str) -> bool:
    return oauth_provider_configured(provider)


def load_provider_config(provider: str) -> OrbOAuthProviderConfig | None:
    key = provider.strip().lower()
    if key not in ORB_OAUTH_PROVIDERS or not provider_enabled(key):
        return None
    if key == "google":
        client_id = os.getenv("OAUTH_GOOGLE_CLIENT_ID", "").strip()
        client_secret = os.getenv("OAUTH_GOOGLE_CLIENT_SECRET", "").strip()
        redirect_uri = os.getenv("OAUTH_GOOGLE_REDIRECT_URI", "").strip()
        if not (client_id and client_secret and redirect_uri):
            return None
        return OrbOAuthProviderConfig(
            name="google",
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            scopes=("openid", "email", "profile"),
            extra_authorize_params={"access_type": "online", "prompt": "select_account"},
        )
    if key == "microsoft":
        client_id = os.getenv("OAUTH_MICROSOFT_CLIENT_ID", "").strip()
        client_secret = os.getenv("OAUTH_MICROSOFT_CLIENT_SECRET", "").strip()
        redirect_uri = os.getenv("OAUTH_MICROSOFT_REDIRECT_URI", "").strip()
        tenant = os.getenv("OAUTH_MICROSOFT_TENANT", "common").strip() or "common"
        if not (client_id and client_secret and redirect_uri):
            return None
        return OrbOAuthProviderConfig(
            name="microsoft",
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            authorize_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
            token_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            userinfo_url="https://graph.microsoft.com/oidc/userinfo",
            scopes=("openid", "email", "profile", "User.Read"),
        )
    if key == "apple":
        client_id = os.getenv("OAUTH_APPLE_CLIENT_ID", "").strip()
        team_id = os.getenv("OAUTH_APPLE_TEAM_ID", "").strip()
        key_id = os.getenv("OAUTH_APPLE_KEY_ID", "").strip()
        private_key = os.getenv("OAUTH_APPLE_PRIVATE_KEY", "").strip()
        redirect_uri = os.getenv("OAUTH_APPLE_REDIRECT_URI", "").strip()
        if not (client_id and team_id and key_id and private_key and redirect_uri):
            return None
        return OrbOAuthProviderConfig(
            name="apple",
            client_id=client_id,
            client_secret="",
            redirect_uri=redirect_uri,
            authorize_url="https://appleid.apple.com/auth/authorize",
            token_url="https://appleid.apple.com/auth/token",
            scopes=("name", "email"),
            extra_authorize_params={"response_mode": "form_post"},
        )
    return None


def build_authorize_url(config: OrbOAuthProviderConfig, *, state: str) -> str:
    params: dict[str, str] = {
        "client_id": config.client_id,
        "redirect_uri": config.redirect_uri,
        "response_type": "code",
        "scope": " ".join(config.scopes),
        "state": state,
    }
    if config.extra_authorize_params:
        params.update(config.extra_authorize_params)
    return f"{config.authorize_url}?{urllib.parse.urlencode(params)}"


async def exchange_code(config: OrbOAuthProviderConfig, code: str) -> dict[str, Any]:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config.redirect_uri,
        "client_id": config.client_id,
        "client_secret": config.client_secret,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(config.token_url, data=data)
        response.raise_for_status()
        return response.json()


async def fetch_userinfo(config: OrbOAuthProviderConfig, access_token: str) -> dict[str, Any]:
    if not config.userinfo_url:
        return {}
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            config.userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


def normalise_profile(provider: str, profile: dict[str, Any]) -> dict[str, Any]:
    key = provider.strip().lower()
    if key == "google":
        return {
            "subject": str(profile.get("sub") or ""),
            "email": str(profile.get("email") or "").strip().lower(),
            "email_verified": bool(profile.get("email_verified")),
            "first_name": profile.get("given_name"),
            "last_name": profile.get("family_name"),
        }
    if key == "microsoft":
        return {
            "subject": str(profile.get("sub") or profile.get("oid") or ""),
            "email": str(profile.get("email") or profile.get("preferred_username") or "").strip().lower(),
            "email_verified": True,
            "first_name": profile.get("given_name"),
            "last_name": profile.get("family_name"),
        }
    if key == "apple":
        return {
            "subject": str(profile.get("sub") or ""),
            "email": str(profile.get("email") or "").strip().lower(),
            "email_verified": bool(profile.get("email_verified", True)),
            "first_name": None,
            "last_name": None,
        }
    return {"subject": "", "email": "", "email_verified": False}


def find_orb_user_by_oauth(conn, *, provider: str, subject: str) -> dict[str, Any] | None:
    from psycopg2.extras import RealDictCursor

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.home_id, u.provider_id
            FROM orb_oauth_accounts oa
            JOIN users u ON u.id = oa.user_id
            WHERE oa.provider = %s AND oa.provider_subject = %s
            LIMIT 1
            """,
            (provider, subject),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def find_orb_user_by_email(conn, email: str) -> dict[str, Any] | None:
    from psycopg2.extras import RealDictCursor

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, email, role, first_name, last_name, home_id, provider_id
            FROM users
            WHERE lower(email) = %s
            LIMIT 1
            """,
            (email.strip().lower(),),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def link_oauth_account(
    conn,
    *,
    user_id: int,
    provider: str,
    subject: str,
    email: str | None,
    email_verified: bool,
    metadata: dict[str, Any] | None = None,
) -> None:
    from psycopg2.extras import Json

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO orb_oauth_accounts (
                user_id, provider, provider_subject, email, email_verified, metadata, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (provider, provider_subject) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                email = EXCLUDED.email,
                email_verified = EXCLUDED.email_verified,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            """,
            (user_id, provider, subject, email, email_verified, Json(metadata or {})),
        )


def create_orb_residential_user(
    conn,
    *,
    email: str,
    first_name: str | None = None,
    last_name: str | None = None,
) -> dict[str, Any]:
    from psycopg2.extras import RealDictCursor

    random_secret = secrets.token_urlsafe(32)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO users (
                email, password_hash, role, home_id, provider_id,
                first_name, last_name, is_active, archived,
                account_status, subscription_active, subscription_status,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, NULL, NULL, %s, %s, TRUE, FALSE, 'active', FALSE, 'inactive', NOW(), NOW())
            RETURNING id, email, role, first_name, last_name, home_id, provider_id
            """,
            (
                email.strip().lower(),
                hash_password(random_secret),
                "orb_residential",
                first_name,
                last_name,
            ),
        )
        return dict(cur.fetchone())


def is_os_scoped_user(user: dict[str, Any]) -> bool:
    role = str(user.get("role") or "").strip().lower()
    if role not in {"orb_residential", "standalone_orb", "orb_user"}:
        if user.get("home_id") or user.get("provider_id"):
            return True
        if role in {"admin", "manager", "staff", "support_worker", "provider", "provider_admin"}:
            return True
    return False


def store_oauth_session(request, *, provider: str, state: str, return_url: str) -> None:
    request.session[ORB_OAUTH_SESSION_STATE_KEY] = state
    request.session[ORB_OAUTH_SESSION_PROVIDER_KEY] = provider
    request.session[ORB_OAUTH_SESSION_RETURN_KEY] = _normalise_return_url(return_url)


def validate_oauth_state(request, *, provider: str, state: str) -> str:
    expected = str(request.session.get(ORB_OAUTH_SESSION_STATE_KEY) or "")
    session_provider = str(request.session.get(ORB_OAUTH_SESSION_PROVIDER_KEY) or "")
    if not expected or not secrets.compare_digest(expected, state):
        raise ValueError("invalid_oauth_state")
    if session_provider != provider:
        raise ValueError("invalid_oauth_provider")
    return_url = _normalise_return_url(str(request.session.get(ORB_OAUTH_SESSION_RETURN_KEY) or "/orb"))
    request.session.pop(ORB_OAUTH_SESSION_STATE_KEY, None)
    request.session.pop(ORB_OAUTH_SESSION_PROVIDER_KEY, None)
    request.session.pop(ORB_OAUTH_SESSION_RETURN_KEY, None)
    return return_url


def oauth_error_redirect(frontend_base: str, message: str) -> str:
    encoded = urllib.parse.quote(message[:200])
    return f"{frontend_base.rstrip('/')}/orb/login?oauth_error={encoded}"
