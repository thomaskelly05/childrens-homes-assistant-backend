from __future__ import annotations

"""Non-secret production configuration diagnostics for ORB Residential."""

import os

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
        if not os.getenv("OAUTH_GOOGLE_CLIENT_ID", "").strip():
            warnings.append("OAUTH_GOOGLE_CLIENT_ID is not set")
        if not os.getenv("OAUTH_GOOGLE_CLIENT_SECRET", "").strip():
            warnings.append("OAUTH_GOOGLE_CLIENT_SECRET is not set")
        if not os.getenv("OAUTH_GOOGLE_REDIRECT_URI", "").strip():
            warnings.append("OAUTH_GOOGLE_REDIRECT_URI is not set")
    elif key == "microsoft":
        if not os.getenv("OAUTH_MICROSOFT_CLIENT_ID", "").strip():
            warnings.append("OAUTH_MICROSOFT_CLIENT_ID is not set")
        if not os.getenv("OAUTH_MICROSOFT_CLIENT_SECRET", "").strip():
            warnings.append("OAUTH_MICROSOFT_CLIENT_SECRET is not set")
        if not os.getenv("OAUTH_MICROSOFT_REDIRECT_URI", "").strip():
            warnings.append("OAUTH_MICROSOFT_REDIRECT_URI is not set")
    elif key == "apple":
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


def oauth_config_warnings() -> dict[str, list[str]]:
    return {
        provider: oauth_provider_config_warnings(provider)
        for provider in ("google", "microsoft", "apple")
        if oauth_provider_configured(provider) or oauth_provider_config_warnings(provider)
    }


def passkey_config_warnings() -> list[str]:
    warnings: list[str] = []
    if not os.getenv("PASSKEY_RP_ID", "").strip():
        warnings.append("PASSKEY_RP_ID is not set — defaulting to app.indicare.co.uk in code")
    origins = os.getenv("PASSKEY_ALLOWED_ORIGINS", "").strip()
    if not origins:
        warnings.append("PASSKEY_ALLOWED_ORIGINS is not set — passkeys may fail outside default origins")
    return warnings
