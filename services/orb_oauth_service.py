from __future__ import annotations

import base64
import json
import logging
import os
import secrets
import urllib.parse
from dataclasses import dataclass
from typing import Any

import httpx

from auth.passwords import hash_password
from services.orb_oauth_provider_env import (
    MICROSOFT_GRAPH_ME_URL,
    apple_auth_enabled,
    microsoft_auth_enabled,
    microsoft_client_id,
    microsoft_client_secret,
    microsoft_redirect_uri,
    microsoft_tenant_id,
)
from services.orb_subscription_plan_service import oauth_provider_configured

logger = logging.getLogger(__name__)

OAUTH_HTTP_TIMEOUT_SECONDS = 8.0

ORB_OAUTH_PROVIDERS = frozenset({"google", "microsoft", "apple"})

ALLOWED_RETURN_PREFIXES = ("/orb", "/orb/onboarding", "/orb/access", "/orb/billing")

GOOGLE_CLIENT_ID_SUFFIX = ".apps.googleusercontent.com"
EXPECTED_GOOGLE_REDIRECT_URI = (
    "https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback"
)


def is_valid_google_client_id(client_id: str) -> bool:
    value = (client_id or "").strip()
    return bool(value) and value.endswith(GOOGLE_CLIENT_ID_SUFFIX) and " " not in value


def google_redirect_uri_matches_expected(redirect_uri: str) -> bool:
    return (redirect_uri or "").strip() == EXPECTED_GOOGLE_REDIRECT_URI


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
        if not is_valid_google_client_id(client_id):
            logger.warning(
                "OAUTH_GOOGLE_CLIENT_ID is set but malformed — Google OAuth start disabled"
            )
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
        if not microsoft_auth_enabled():
            return None
        client_id = microsoft_client_id()
        client_secret = microsoft_client_secret()
        redirect_uri = microsoft_redirect_uri()
        tenant = microsoft_tenant_id()
        if not (client_id and client_secret and redirect_uri):
            return None
        return OrbOAuthProviderConfig(
            name="microsoft",
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            authorize_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
            token_url=f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            userinfo_url=MICROSOFT_GRAPH_ME_URL,
            scopes=("openid", "profile", "email", "User.Read"),
            extra_authorize_params={"response_mode": "query"},
        )
    if key == "apple":
        if not apple_auth_enabled():
            return None
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


async def exchange_code(
    config: OrbOAuthProviderConfig,
    code: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config.redirect_uri,
        "client_id": config.client_id,
        "client_secret": config.client_secret,
    }
    if client is not None:
        response = await client.post(config.token_url, data=data)
        response.raise_for_status()
        return response.json()
    async with httpx.AsyncClient(timeout=OAUTH_HTTP_TIMEOUT_SECONDS) as owned:
        response = await owned.post(config.token_url, data=data)
        response.raise_for_status()
        return response.json()


async def fetch_userinfo(
    config: OrbOAuthProviderConfig,
    access_token: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    if not config.userinfo_url:
        return {}
    headers = {"Authorization": f"Bearer {access_token}"}
    if client is not None:
        response = await client.get(config.userinfo_url, headers=headers)
        response.raise_for_status()
        return response.json()
    async with httpx.AsyncClient(timeout=OAUTH_HTTP_TIMEOUT_SECONDS) as owned:
        response = await owned.get(config.userinfo_url, headers=headers)
        response.raise_for_status()
        return response.json()


def decode_id_token_claims_unverified(id_token: str) -> dict[str, Any]:
    """Extract non-sensitive claims from an id_token without verifying the signature."""
    parts = str(id_token or "").split(".")
    if len(parts) < 2:
        return {}
    padded = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(padded))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _microsoft_profile_from_id_token(id_token: str | None) -> dict[str, Any]:
    claims = decode_id_token_claims_unverified(id_token or "")
    if not claims:
        return {}
    subject = str(claims.get("sub") or claims.get("oid") or "").strip()
    email = str(
        claims.get("email")
        or claims.get("preferred_username")
        or claims.get("upn")
        or ""
    ).strip()
    if not subject or not email:
        return {}
    return {
        **claims,
        "id": subject,
        "sub": subject,
        "email": email.lower(),
        "email_verified": True,
    }


async def fetch_microsoft_profile(access_token: str, *, id_token: str | None = None) -> dict[str, Any]:
    """Prefer id_token claims; call Graph /me only when required fields are missing."""
    from_id_token = _microsoft_profile_from_id_token(id_token)
    if from_id_token:
        return from_id_token

    profile: dict[str, Any] = {}
    try:
        profile = await fetch_userinfo(
            OrbOAuthProviderConfig(
                name="microsoft",
                client_id="",
                client_secret="",
                redirect_uri="",
                authorize_url="",
                token_url="",
                userinfo_url=MICROSOFT_GRAPH_ME_URL,
            ),
            access_token,
        )
    except Exception:
        logger.warning("Microsoft Graph profile fetch failed; falling back to id_token claims when available")
    if not str(profile.get("id") or "").strip() and id_token:
        claims = decode_id_token_claims_unverified(id_token)
        profile = {**claims, **profile}
    return profile


def normalise_profile(provider: str, profile: dict[str, Any]) -> dict[str, Any]:
    from services.orb_user_avatar_service import extract_provider_avatar_url

    key = provider.strip().lower()
    avatar_url = extract_provider_avatar_url(key, profile)
    if key == "google":
        return {
            "subject": str(profile.get("sub") or ""),
            "email": str(profile.get("email") or "").strip().lower(),
            "email_verified": bool(profile.get("email_verified")),
            "first_name": profile.get("given_name"),
            "last_name": profile.get("family_name"),
            "avatar_url": avatar_url,
        }
    if key == "microsoft":
        display_name = str(profile.get("displayName") or "").strip()
        first_name = profile.get("given_name")
        last_name = profile.get("family_name")
        if not first_name and display_name:
            parts = display_name.split(None, 1)
            first_name = parts[0] if parts else None
            last_name = parts[1] if len(parts) > 1 else None
        return {
            "subject": str(profile.get("id") or profile.get("sub") or profile.get("oid") or ""),
            "email": str(
                profile.get("mail")
                or profile.get("userPrincipalName")
                or profile.get("email")
                or profile.get("preferred_username")
                or ""
            ).strip().lower(),
            "email_verified": True,
            "first_name": first_name,
            "last_name": last_name,
            "avatar_url": avatar_url,
        }
    if key == "apple":
        return {
            "subject": str(profile.get("sub") or ""),
            "email": str(profile.get("email") or "").strip().lower(),
            "email_verified": bool(profile.get("email_verified", True)),
            "first_name": None,
            "last_name": None,
            "avatar_url": avatar_url,
        }
    return {"subject": "", "email": "", "email_verified": False, "avatar_url": None}


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


def store_oauth_session(
    conn,
    *,
    provider: str,
    state: str,
    return_url: str,
    start_host: str | None = None,
) -> None:
    from services.orb_oauth_state_service import store_oauth_state

    normalised_return = _normalise_return_url(return_url)
    store_oauth_state(
        conn,
        state_token=state,
        provider=provider,
        return_url=normalised_return,
        start_host=start_host,
    )


def validate_oauth_state(
    conn,
    *,
    provider: str,
    state: str,
) -> str:
    from services.orb_oauth_state_service import consume_oauth_state

    payload = consume_oauth_state(
        conn,
        state_token=state,
        provider=provider,
    )
    return _normalise_return_url(str(payload.get("return_url") or "/orb"))


def oauth_error_redirect(frontend_base: str, message: str) -> str:
    encoded = urllib.parse.quote(message[:200])
    return f"{frontend_base.rstrip('/')}/orb?oauth_error={encoded}"
