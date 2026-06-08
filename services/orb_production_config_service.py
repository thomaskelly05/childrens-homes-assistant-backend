from __future__ import annotations

"""Non-secret production configuration diagnostics for ORB Residential."""

import os

from services.orb_oauth_provider_env import (
    EXPECTED_MICROSOFT_REDIRECT_URI,
    apple_auth_enabled,
    microsoft_auth_enabled,
    microsoft_client_id,
    microsoft_client_secret,
    microsoft_redirect_uri,
    microsoft_tenant_id,
)
from services.orb_oauth_service import google_redirect_uri_matches_expected
from services.orb_subscription_plan_service import oauth_provider_configured, orb_residential_stripe_price_id

def stripe_config_warnings() -> list[str]:
    warnings: list[str] = []
    if not os.getenv("STRIPE_SECRET_KEY", "").strip():
        warnings.append("STRIPE_SECRET_KEY is not set — checkout and portal are unavailable")
    if not orb_residential_stripe_price_id():
        warnings.append("ORB_RESIDENTIAL_STRIPE_PRICE_ID is not set — subscription checkout cannot start")
    if not os.getenv("STRIPE_WEBHOOK_SECRET", "").strip():
        warnings.append("STRIPE_WEBHOOK_SECRET is not set — subscription status will not sync automatically")
    if not os.getenv("FRONTEND_APP_URL", "").strip() and not os.getenv("APP_BASE_URL", "").strip():
        warnings.append("FRONTEND_APP_URL or APP_BASE_URL should be set for checkout return URLs")
    return warnings


def oauth_provider_config_warnings(provider: str) -> list[str]:
    key = provider.strip().lower()
    warnings: list[str] = []
    if key == "google":
        client_id = os.getenv("OAUTH_GOOGLE_CLIENT_ID", "").strip()
        if not client_id:
            warnings.append("OAUTH_GOOGLE_CLIENT_ID is not set")
        elif not client_id.endswith(".apps.googleusercontent.com"):
            warnings.append(
                "OAUTH_GOOGLE_CLIENT_ID must end with .apps.googleusercontent.com"
            )
        if not os.getenv("OAUTH_GOOGLE_CLIENT_SECRET", "").strip():
            warnings.append("OAUTH_GOOGLE_CLIENT_SECRET is not set")
        redirect_uri = os.getenv("OAUTH_GOOGLE_REDIRECT_URI", "").strip()
        if not redirect_uri:
            warnings.append("OAUTH_GOOGLE_REDIRECT_URI is not set")
        elif not google_redirect_uri_matches_expected(redirect_uri):
            warnings.append(
                "OAUTH_GOOGLE_REDIRECT_URI should be "
                "https://api.indicare.co.uk/orb/standalone/auth/oauth/google/callback"
            )
    elif key == "microsoft":
        if not microsoft_auth_enabled():
            warnings.append("MICROSOFT_AUTH_ENABLED is not true")
        if not microsoft_client_id():
            warnings.append("MICROSOFT_CLIENT_ID (or OAUTH_MICROSOFT_CLIENT_ID) is not set")
        if not microsoft_client_secret():
            warnings.append("MICROSOFT_CLIENT_SECRET (or OAUTH_MICROSOFT_CLIENT_SECRET) is not set")
        if not microsoft_redirect_uri():
            warnings.append("MICROSOFT_REDIRECT_URI (or OAUTH_MICROSOFT_REDIRECT_URI) is not set")
    elif key == "apple":
        if not apple_auth_enabled():
            return warnings
        for env_name in (
            "OAUTH_APPLE_CLIENT_ID",
            "OAUTH_APPLE_TEAM_ID",
            "OAUTH_APPLE_KEY_ID",
            "OAUTH_APPLE_PRIVATE_KEY",
            "OAUTH_APPLE_REDIRECT_URI",
        ):
            if not os.getenv(env_name, "").strip():
                warnings.append(f"{env_name} is not set")
    return warnings


def _diagnostic_providers() -> tuple[str, ...]:
    providers: list[str] = ["google", "microsoft"]
    if apple_auth_enabled():
        providers.append("apple")
    return tuple(providers)


def oauth_config_warnings() -> dict[str, list[str]]:
    return {
        provider: oauth_provider_config_warnings(provider)
        for provider in _diagnostic_providers()
        if oauth_provider_configured(provider) or oauth_provider_config_warnings(provider)
    }


def _oauth_redirect_uri(provider: str) -> str | None:
    key = provider.strip().lower()
    if key == "microsoft":
        value = microsoft_redirect_uri()
        return value or None
    env_map = {
        "google": "OAUTH_GOOGLE_REDIRECT_URI",
        "apple": "OAUTH_APPLE_REDIRECT_URI",
    }
    env_name = env_map.get(key)
    if not env_name:
        return None
    value = os.getenv(env_name, "").strip()
    return value or None


def oauth_provider_diagnostics(provider: str) -> dict[str, object]:
    """Non-secret OAuth wiring diagnostics for admin/development surfaces."""
    from services.orb_oauth_service import (
        EXPECTED_GOOGLE_REDIRECT_URI,
        google_redirect_uri_matches_expected,
        is_valid_google_client_id,
        load_provider_config,
    )

    key = provider.strip().lower()
    configured = load_provider_config(key) is not None
    warnings = oauth_provider_config_warnings(key)
    redirect_uri = _oauth_redirect_uri(key)
    env_requirements: dict[str, list[str]] = {
        "google": ["OAUTH_GOOGLE_CLIENT_ID", "OAUTH_GOOGLE_CLIENT_SECRET", "OAUTH_GOOGLE_REDIRECT_URI"],
        "microsoft": [
            "MICROSOFT_AUTH_ENABLED",
            "MICROSOFT_CLIENT_ID",
            "MICROSOFT_CLIENT_SECRET",
            "MICROSOFT_REDIRECT_URI",
            "MICROSOFT_TENANT_ID",
        ],
        "apple": [
            "APPLE_AUTH_ENABLED",
            "OAUTH_APPLE_CLIENT_ID",
            "OAUTH_APPLE_TEAM_ID",
            "OAUTH_APPLE_KEY_ID",
            "OAUTH_APPLE_PRIVATE_KEY",
            "OAUTH_APPLE_REDIRECT_URI",
        ],
    }
    payload: dict[str, object] = {
        "provider": key,
        "enabled": configured,
        "missing_config_warnings": warnings,
        "redirect_uri": redirect_uri,
        "expected_redirect_uri": redirect_uri,
        "start_route": f"/orb/standalone/auth/oauth/{key}/start",
        "callback_route": f"/orb/standalone/auth/oauth/{key}/callback",
        "required_env_vars": env_requirements.get(key, []),
    }
    if key == "microsoft":
        payload.update(
            {
                "microsoft_enabled": configured,
                "client_id_present": bool(microsoft_client_id()),
                "client_secret_present": bool(microsoft_client_secret()),
                "tenant_id_present": bool(microsoft_tenant_id()),
                "redirect_uri_present": bool(microsoft_redirect_uri()),
                "expected_redirect_uri": EXPECTED_MICROSOFT_REDIRECT_URI,
            }
        )
    if key == "google":
        client_id = os.getenv("OAUTH_GOOGLE_CLIENT_ID", "").strip()
        payload.update(
            {
                "client_id_present": bool(client_id),
                "client_id_suffix_valid": is_valid_google_client_id(client_id),
                "client_id_ends_with_googleusercontent": bool(
                    client_id and client_id.endswith(".apps.googleusercontent.com")
                ),
                "redirect_uri_matches_expected": google_redirect_uri_matches_expected(
                    redirect_uri or ""
                ),
                "expected_redirect_uri": EXPECTED_GOOGLE_REDIRECT_URI,
            }
        )
    return payload


def oauth_providers_diagnostics() -> dict[str, dict[str, object]]:
    return {provider: oauth_provider_diagnostics(provider) for provider in _diagnostic_providers()}


def passkey_config_warnings() -> list[str]:
    warnings: list[str] = []
    if not os.getenv("PASSKEY_RP_ID", "").strip():
        warnings.append("PASSKEY_RP_ID is not set — defaulting to app.indicare.co.uk in code")
    origins = os.getenv("PASSKEY_ALLOWED_ORIGINS", "").strip()
    if not origins:
        warnings.append("PASSKEY_ALLOWED_ORIGINS is not set — passkeys may fail outside default origins")
    return warnings
